## Open Logseq in VS Code

Open and edit Logseq pages and config files in VS Code

![demo](./demo.gif)


### Usage
Default shortcuts 
- open graph: `mod+shift+o`
- open current page: `mod+o` 
- open current block: `mod+alt+o`  

Or type names in the command palette to see corresponding commands.

Notice also a existent keybinding `ctrl+d ctrl+a` in Logseq which opens current page in default app.
 
Any application, as long as it supports url scheme, could be added as an option. Feel free to tweak `generateUrl` function in `src/App.vue`.

### Development

- `npm install` in terminal to install dependencies.
- `npm run build` or `npm run watch` to build. 
- `Load unpacked plugin` in Logseq Desktop client.