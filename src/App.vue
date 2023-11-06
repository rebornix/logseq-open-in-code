<template>
  <div class="container-wrap" v-bind:class="{ lspdark: opts.isDark }" @click="_onClickOutside">
    <div class="container-inner shadow-lg" v-if="ready" :style="{ left: left + 'px', top: top + 'px' }">
      <div class="_opener" v-if="currentPage" @click="_onClickOpenCurrentPage">
        Edit current page
      </div>
      <div class="_opener" @click="_onClickOpenConfig">Edit config.edn</div>
      <div class="_opener" @click="_onClickOpenCSS">Edit custom.css</div>
      <div class="_opener" @click="_onClickOpenCurrentGraph">
        Open graph folder
      </div>
    </div>
  </div>
</template>

<script>
const __debug = false;

function generateUrl(path, line_num = 0, new_window = true) {
  const { distro } = logseq.settings;
  const protocol = distro === "stable" ? "vscode" : distro === "insiders" ? "vscode-insiders" : "vscodium";

  const line = line_num ? `:${line_num}:0` : "";

  const windowId = new_window ? "?windowId=_blank" : "";


  return `${protocol}://file/` + encodeURIComponent(path) + line + windowId;
}

async function openConfig(name) {
  const graph = await logseq.App.getCurrentGraph();
  window.open(
    generateUrl(graph.url.replace("logseq_local_", "") + "/logseq/" + name)
  );
}

function if_new_window() {
  return (logseq.settings.window.includes("new"));
}

async function openGraph() {
  const graph = await logseq.App.getCurrentGraph();
  window.open(generateUrl(graph.url.replace("logseq_local_", ""), 0, true));
}

async function getAncestorPageOfCurrentBlock() {
  const block = await logseq.Editor.getCurrentBlock();
  return block?.page;
}

async function findFile(fileId) {
  const graph = await logseq.App.getCurrentGraph();

  const matches = await logseq.DB.datascriptQuery(
    `[:find ?file
                :where
                [?b :file/path ?file]
                [(== ?b ${fileId})]
            ]`
  );

  if (matches && matches.length > 0) {
    const file = graph.url.replace("logseq_local_", "") + "/" + matches[0][0];
    return file;
  } else {
    return null;
  }
}

async function openPageLineInVSCode(line_number) {
  const currentPage = await logseq.Editor.getCurrentPage();
  if (currentPage && currentPage.file) {
    const fileId = currentPage.file.id;
    const file = await findFile(fileId);

    if (file) {
      window.open(generateUrl(file, line_number, if_new_window()));
      return;
    }
  }

  const ansetor = await getAncestorPageOfCurrentBlock();
  if (ansetor) {
    const page = await logseq.Editor.getPage(ansetor.id);
    if (page && page.file) {
      const fileId = page.file.id;
      const file = await findFile(fileId);
      if (file) {
        window.open(generateUrl(file, line_number, if_new_window()));
        return;
      }
    }
  }
}

async function openPageInVSCode() {
  if (logseq.settings.window.includes("graph")) {
    await openGraph();
  }
  await openPageLineInVSCode(0);
}

function reorder_children(children) {
  let id_chains = children.map(child => child.left);

  children.sort((a, b) => {
    let indexA = id_chains.indexOf(a.left);
    let indexB = id_chains.indexOf(b.left);
    if (indexA < indexB) {
      return -1;
    } else if (indexA > indexB) {
      return 1;
    } else {
      return 0;
    }
  });
}

// To count the line number of a block in correct order, we need to reorder the children of the block
function count_line_in_block(block, line, reorder = false) {
  let count = block.content.split('\n').length;
  let found_line = block.id === line.id;

  if (found_line) {
    return { lineCount: count, hasLine: found_line };
  }

  if (block.children.length === 0) {
    if (__debug) {
      console.log(block);
    }
    return { lineCount: count, hasLine: found_line };
  }


  if (block.children.length > 0) {
    // iterate over children blocks 
    if (reorder) {
      reorder_children(block.children);
    }

    for (let index = 0; index < block.children.length; index++) {
      const child = block.children[index];
      // count the line number of each child block
      if (found_line) {
        break;
      }
      let search_subblock = count_line_in_block(child, line);
      if (__debug) {
        console.log(child.content, "old count", count, "inc", search_subblock.lineCount, search_subblock.hasLine);
      }
      count += search_subblock.lineCount;
      found_line = search_subblock.hasLine;
    }
    if (__debug) {
      console.log(block.content, count, found_line);
    }
    return { lineCount: count, hasLine: found_line };
  }
}

async function openCurrentLine() {

  if (logseq.settings.window.includes("graph")) {
    await openGraph();
  }

  let count = 0;
  let curb = await logseq.Editor.getCurrentBlock();
  if (__debug) {
    console.log("current block", curb);
  }
  // let all_blocks = await logseq.Editor.getCurrentPageBlocksTree();

  // if (all_blocks.length === 1 && !('content' in all_blocks[0])) {
  // It seems possible to get a page by name but not id. Strange
  const page = await logseq.Editor.getPage(curb?.page.id);
  let all_blocks = await logseq.Editor.getPageBlocksTree(page.name);
  // }
  if (__debug) {
    console.log(all_blocks);
  }

  for (let index = 0; index < all_blocks.length; index++) {
    if (index === 0) {
      // if the first block is a property block, trim it and count lines
      let first_block = all_blocks[0].content.trim().split('\n');
      if (first_block[0].includes("::")) {
        count += first_block.length + 1;
        continue;
      }
    }
    const block = all_blocks[index];
    let subcount = count_line_in_block(block, curb, true);
    count += subcount.lineCount
    if (__debug) {
      console.log("level 0", index, count);
    }
    if (subcount.hasLine) {
      break;
    }
  }

  await openPageLineInVSCode(count);
}

async function registerShortcuts() {
  logseq.App.registerCommandPalette({
    key: `Open_current_line_in_default_editor`,
    label: "Open current line in default editor",
    keybinding: {
      binding: logseq.settings.key_open_line,
      mode: "global",
    }
  },
    openCurrentLine
  );
  logseq.App.registerCommandPalette({
    key: `Open_current_page_in_default_editor`,
    label: "Open current page in default editor",
    keybinding: {
      binding: logseq.settings.key_open_page,
      mode: "global",
    }
  },
    openPageInVSCode
  );

  logseq.App.registerCommandPalette({
    key: `Open_graph_folder_in_default_editor`,
    label: "Open graph folder in default editor",
    keybinding: {
      binding: logseq.settings.key_open_graph,
      mode: "global",
    }
  },
    openGraph
  );
}

export default {
  name: "App",

  data() {
    return {
      ready: false,
      left: 0,
      top: 0,
      currentPage: false,
      opts: {
        isDark: false,
      },
    };
  },

  mounted() {
    logseq.App.getUserConfigs().then(
      (c) => (this.opts.isDark = c.preferredThemeMode === "dark")
    );

    logseq.App.onThemeModeChanged(({ mode }) => {
      this.opts.isDark = mode === "dark";
    });

    logseq.once("ui:visible:changed", ({ visible }) => {
      visible && (this.ready = true);
    });

    const checkCurrentPage = async () => {
      const currentPage = await logseq.Editor.getCurrentPage();

      if (currentPage && currentPage.file) {
        this.currentPage = true;
      } else {
        const ansestor = await getAncestorPageOfCurrentBlock();
        if (ansestor) {
          this.currentPage = true;
        } else {
          this.currentPage = false;
        }
      }
    };

    logseq.on("ui:visible:changed", ({ visible }) => {
      if (visible) {
        const el = top.document.querySelector(`a#open-in-code-anchor`);
        const rect = el.getBoundingClientRect();
        this.left = rect.left - 50;
        this.top = rect.top + 30;
        checkCurrentPage();
      }
    });

    logseq.App.onRouteChanged(({ path }) => {
      checkCurrentPage();
    });

    checkCurrentPage();

    registerShortcuts();
  },

  methods: {
    _onClickOutside({ target }) {
      const inner = target.closest(".container-inner");

      !inner && logseq.hideMainUI();
    },
    _onClickOpenCurrentPage() {
      openPageInVSCode();
    },
    _onClickOpenCurrentGraph() {
      openGraph();
    },
    _onClickOpenConfig() {
      openConfig("config.edn");
    },
    _onClickOpenCSS() {
      openConfig("custom.css");
    },
  },
};
</script>
