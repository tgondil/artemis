import subprocess

def list_chrome_tabs():
    script = '''
    tell application "Google Chrome"
        if (count of windows) = 0 then return "NO_WINDOWS"
        set frontWin to front window
        set tabCount to count of tabs of frontWin
        set outStr to ""
        repeat with i from 1 to tabCount
            set t to tab i of frontWin
            set tabTitle to title of t
            set tabURL to URL of t
            set outStr to outStr & (i as text) & " || " & tabTitle & " || " & tabURL & linefeed
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
        try:
            idx, title, url = line.split("||")
            tabs.append((int(idx.strip()), title.strip(), url.strip()))
        except ValueError:
            continue
    return tabs


def print_tabs(tabs):
    print("\n🪟 Tabs in the current Chrome window:\n")
    for idx, title, url in tabs:
        print(f"[{idx}] {title[:100]} — {url}")


def parse_indices(choice, max_index):
    if not choice:
        return []
    parts = [p.strip() for p in choice.split(",") if p.strip()]
    indices = set()
    for p in parts:
        if "-" in p:
            a, b = p.split("-", 1)
            if a.isdigit() and b.isdigit():
                for k in range(int(a), int(b) + 1):
                    indices.add(k)
        elif p.isdigit():
            indices.add(int(p))
    return sorted(i for i in indices if 1 <= i <= max_index)


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
                if u is not "" then
                    set urlsText to urlsText & u & linefeed
                end if
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
    print(len(urls))
    if not urls:
        print("⚠️ No URLs to open.")
        return None

    # Properly define the URL list inside AppleScript
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
    result = subprocess.run(["osascript", "-e", script], capture_output=True, text=True)
    window_id = result.stdout.strip()
    print(f"✅ Opened and minimized new window ({window_id}) with {len(urls)} tabs.")
    return window_id


def main():
    tabs = list_chrome_tabs()
    if not tabs:
        return
    print_tabs(tabs)

    max_index = max(idx for idx, _, _ in tabs)
    choice = input("\nEnter tab numbers to move (comma-separated or ranges e.g. 1,3,5-7): ").strip()
    indices = parse_indices(choice, max_index)
    if not indices:
        print("⚠️ No valid tabs selected.")
        return

    urls = get_tab_urls(indices)
    close_tabs(indices)
    print("🌐 Opening those URLs in a new minimized window...")
    open_urls_in_new_window(urls)


if __name__ == "__main__":
    main()
