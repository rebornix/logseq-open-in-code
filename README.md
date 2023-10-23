## Open Logseq in VS Code

Open and edit Logseq pages and config files in VS Code

![demo](./demo.gif)


### Usage
- open graph: `mod+shift+o`
- open current page: `mod+o` 
 
Notice Logseq already provides a keybinding `ctrl+d ctrl+a` which opens current page in default app.
(Personally, I need one more shortcut because I use nvim as default app for markdown while still vscode is used sometimes.)  
 
Any application, as long as it supports url scheme, could be added as an option. Feel free to tweak `generateUrl` function in `src/App.vue`.

### Development

- `npm install && npm run build` in terminal to install dependencies.
- `Load unpacked plugin` in Logseq Desktop client.
