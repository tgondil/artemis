import subprocess
import os
import json
import google.generativeai as genai

# ---------------- GEMINI FUNCTIONS ---------------- #

def analyze_tab_topics(tabs):
    """Analyze Chrome tabs and return structured JSON grouping."""
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    model = genai.GenerativeModel("models/gemini-2.5-flash")

    tab_text = "\n".join([f"{i}. {title} — {url}" for i, title, url, _ in tabs])
    prompt = f"""
    The user currently has the following Chrome tabs open:
    {tab_text}

    Group them by topic or intent.
    Identify which tabs are unrelated to any group.
    Output JSON strictly in this format:
    {{
      "topics": [
        {{
          "name": "<topic name>",
          "tabs": ["<tab title 1>", "<tab title 2>", ...]
        }}
      ],
      "unrelated": ["<tab title>", ...]
    }}
    """

    response = model.generate_content(prompt)
    text = response.text.strip()
    print("\n🧠 Gemini Topic Analysis:\n")
    print(text)
    try:
        data = json.loads(text)
        return data
    except Exception:
        print("⚠️ Could not parse Gemini response as JSON.")
        return None


# ---------------- CHROME APPLESCRIPT FUNCTIONS ---------------- #

def analyze_tab_topics(tabs):
    """Analyze Chrome tabs with Gemini and return parsed JSON."""
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    model = genai.GenerativeModel("models/gemini-2.5-flash")

    tab_text = "\n".join([f"{i}. {title} — {url}" for i, title, url, _ in tabs])
    prompt = f"""
    The user currently has the following Chrome tabs open:
    {tab_text}

    Group them by topic or intent.
    Identify which tabs are unrelated to any group.
    Output JSON strictly in this format:
    {{
      "topics": [
        {{
          "name": "<topic name>",
          "tabs": ["<tab title 1>", "<tab title 2>", ...]
        }}
      ],
      "unrelated": ["<tab title>", ...]
    }}
    """

    response = model.generate_content(prompt)
    text = response.text.strip()
    print("\n🧠 Gemini Topic Analysis:\n")
    print(text)

    # --- FIX: strip code fences or Markdown formatting ---
    if "```" in text:
        import re
        matches = re.findall(r"```(?:json)?(.*?)```", text, re.DOTALL)
        if matches:
            text = matches[0].strip()

    # Try to load clean JSON
    try:
        data = json.loads(text)
        return data
    except json.JSONDecodeError as e:
        print(f"⚠️ Could not parse Gemini response as JSON: {e}")
        return None


def list_chrome_tabs():
    """Return a list of (index, title, url, is_active)."""
    script = '''
    tell application "Google Chrome"
        if (count of windows) = 0 then return "NO_WINDOWS"
        set frontWin to front window
        set activeTabIndex to active tab index of frontWin
        set tabCount to count of tabs of frontWin
        set outStr to ""
        repeat with i from 1 to tabCount
            set t to tab i of frontWin
            set tabTitle to title of t
            set tabURL to URL of t
            if i = activeTabIndex then
                set outStr to outStr & (i as text) & " || ACTIVE || " & tabTitle & " || " & tabURL & linefeed
            else
                set outStr to outStr & (i as text) & " || " & tabTitle & " || " & tabURL & linefeed
            end if
        end repeat
        return outStr
    end tell
    '''
    result = subprocess.run(["osascript", "-e", script], capture_output=True, text=True)
    stdout = result.stdout.strip()
    if "NO_WINDOWS" in stdout:
        print("❌ No Chrome windows open.")
        return []

    tabs = []
    for line in stdout.splitlines():
        parts = line.split("||")
        if len(parts) >= 3:
            idx = int(parts[0].strip())
            active_flag = "ACTIVE" in parts[1]
            if active_flag:
                title = parts[2].strip()
                url = parts[3].strip() if len(parts) > 3 else ""
            else:
                title = parts[1].strip()
                url = parts[2].strip()
            tabs.append((idx, title, url, active_flag))
    return tabs


def get_tab_urls(indices):
    if not indices:
        return []
    indices_str = ", ".join(str(i) for i in indices)
    script = f'''
    tell application "Google Chrome"
        set frontWin to front window
        set urlsText to ""
        repeat with i in {{{indices_str}}}
            try
                set u to URL of tab (i as integer) of frontWin
                if u is not "" then set urlsText to urlsText & u & linefeed
            end try
        end repeat
        return urlsText
    end tell
    '''
    result = subprocess.run(["osascript", "-e", script], capture_output=True, text=True)
    urls = [u.strip() for u in result.stdout.strip().splitlines() if u.strip()]
    return urls


def close_tabs(indices):
    if not indices:
        return
    indices_str = ", ".join(str(i) for i in indices)
    script = f'''
    tell application "Google Chrome"
        set frontWin to front window
        repeat with i in reverse of {{{indices_str}}}
            try
                close tab (i as integer) of frontWin
            end try
        end repeat
    end tell
    '''
    subprocess.run(["osascript", "-e", script])
    print(f"✅ Closed tabs: {indices_str}")


def open_urls_in_new_window(urls):
    if not urls:
        return None
    urls_list = '", "'.join(urls)
    script = f'''
    tell application "Google Chrome"
        activate
        set urlList to {{"{urls_list}"}}
        set newWindow to make new window
        tell newWindow
            set URL of active tab to item 1 of urlList
            repeat with i from 2 to (count of urlList)
                make new tab at end with properties {{URL:(item i of urlList)}}
            end repeat
        end tell
        set minimized of newWindow to true
        return id of newWindow
    end tell
    '''
    subprocess.run(["osascript", "-e", script], capture_output=True, text=True)
    print(f"✅ Opened new minimized window with {len(urls)} tabs.")


# ---------------- MAIN LOGIC ---------------- #

def main():
    tabs = list_chrome_tabs()
    if not tabs:
        return

    print("\n🪟 Tabs in the current Chrome window:\n")
    for idx, title, url, active_flag in tabs:
        marker = "⭐ ACTIVE" if active_flag else ""
        print(f"[{idx}] {title[:100]} — {url} {marker}")

    # 🔍 Call Gemini and parse structured JSON
    data = analyze_tab_topics(tabs)
    if not data:
        print("❌ Could not analyze tab topics.")
        return

    # 🟩 Identify active tab
    active_tab = next((t for t in tabs if t[3]), None)
    if not active_tab:
        print("⚠️ No active tab found.")
        return
    active_title = active_tab[1]
    print(f"\n➡️ Active tab: {active_title}")

    # 🟨 Identify which topic contains the active tab
    active_topic = None
    for topic in data.get("topics", []):
        for tab_title in topic.get("tabs", []):
            if tab_title.lower() in active_title.lower() or active_title.lower() in tab_title.lower():
                active_topic = topic["name"]
                break
        if active_topic:
            break

    if not active_topic:
        print("⚠️ Active tab not found in any topic.")
        return

    print(f"📂 Active tab belongs to topic: {active_topic}")

    # 🟥 Collect unrelated tab indices (not in active topic)
    unrelated_indices = []
    for idx, title, url, _ in tabs:
        if title == active_title:
            continue
        belongs = any(title.lower() in t.lower() or t.lower() in title.lower()
                      for tp in data["topics"] if tp["name"] == active_topic for t in tp["tabs"])
        if not belongs:
            unrelated_indices.append(idx)

    # 🟦 If unrelated tabs exist, move them to a new minimized window
    if unrelated_indices:
        urls = get_tab_urls(unrelated_indices)
        open_urls_in_new_window(urls)
        close_tabs(unrelated_indices)
        print("🌐 Moved all unrelated tabs to a new minimized window and closed it.")
    else:
        print("✅ All tabs are related to the current one.")


# ------------------------------------------------ #

if __name__ == "__main__":
    main()
