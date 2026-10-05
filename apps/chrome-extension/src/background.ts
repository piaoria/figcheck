import { handleCommand } from './command';
chrome.commands.onCommand.addListener((command, tab) => { return handleCommand(command, tab).catch(() => {}); });
