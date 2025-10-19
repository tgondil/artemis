import { activeWindow } from 'get-windows';

async function testWindows() {
  console.log('Testing get-windows package...');
  
  try {
    const win = await activeWindow();
    console.log('activeWindow() result:', win);
    
    if (win) {
      console.log('✅ Window detected:', {
        title: win.title,
        app: win.owner.name,
        processId: win.owner.processId
      });
    } else {
      console.log('❌ No window detected');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testWindows();
