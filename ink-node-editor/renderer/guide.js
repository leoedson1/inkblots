(() => {
  const I = window.InkblotsI18n;
  function ui(tag, text) { return I.bind(document.createElement(tag),text); }
  function createGuide(id,title) {
    const dialog=document.createElement('dialog');dialog.id=id;dialog.className='help-guide';
    dialog.setAttribute('aria-labelledby',id+'-title');
    const header=document.createElement('header'),heading=ui('h2',title),close=ui('button','Close');
    heading.id=id+'-title';close.className='btn';close.autofocus=true;close.onclick=()=>dialog.close();
    header.append(heading,close);dialog.append(header);document.body.append(dialog);
    dialog.addEventListener('keydown',e=>e.stopPropagation());
    return dialog;
  }
  const guide=createGuide('user-guide','Inkblots · Quick guide');
  const sections = [
  [
    "p",
    "Write branching stories in Ink, arrange them as a graph, and play them as you go."
  ],
  [
    "h3",
    "Start a story"
  ],
  [
    "p",
    "File → New file (Ctrl+N) or Open (Ctrl+O) starts a tab. Try Ink → Full stories → Full Feature Demo. Closing the last tab opens the welcome screen."
  ],
  [
    "h3",
    "Write and connect"
  ],
  [
    "p",
    "Click a node to edit its name and Ink text. Knots are scenes; stitches are sections within them. A divert (-> scene) connects scenes. Use * for a one-time choice or + for a repeatable choice. Hover Ink menu items for syntax help."
  ],
  [
    "p",
    "Shift+A or right-click empty canvas opens searchable Ink insertion at the cursor. Story → Full script (Ctrl+E) edits the complete source. Ink syntax and authored text stay unchanged when you change the interface language."
  ],
  [
    "h3",
    "Arrange your canvas"
  ],
  [
    "p",
    "Shift + left drag selects nodes; drag a selected node to move the selection. Ctrl+G groups immediately. Double-click a zone name to rename it. Drag its header to move its members; + and − add or remove selected members. Zones expand and contract to fit their nodes. Empty zones can be resized manually."
  ],
  [
    "p",
    "Story → Sticky note adds a note. Drag its header to move it, its corner to resize it, and use its dot to change color. Removing a zone keeps its nodes. Navigate with the bottom-left minimap, View → Fit graph, or Story → Tidy layout (Ctrl+L)."
  ],
  [
    "h3",
    "Comments and playtesting"
  ],
  [
    "p",
    "Hover a node’s balloon for comments. Play (Ctrl+Enter) starts the story. Test from here starts a fresh run at the selected knot; optional test values do not change the script. Problems shows compiler errors."
  ],
  [
    "h3",
    "Save and recover"
  ],
  [
    "p",
    "Ctrl+S saves; Ctrl+Shift+S saves as another file. Ctrl+Z undoes graph edits; Ctrl+Shift+Z redoes them. Positions, zones and sticky notes are stored as safe comments in the .ink file. Save before closing; Don’t Save discards unsaved changes and Cancel keeps the file open."
  ],
  [
    "p",
    "Language → System default follows your system language. Choose English, Japanese, Simplified Chinese or Brazilian Portuguese to override it. Help → Hotkeys guide lists shortcuts; Ink writing guide opens the external language reference."
  ]
];
  sections.push(['h3','Node editing and variables'],
    ['p','Click story text or a choice label on a node to edit its words. Enter finishes editing; Escape cancels. Ink markers, conditions and diverts stay in the inspector. Sticky choices use + and one-time choices use *.'],
    ['p','The bottom half of the inspector manages global variables. Add, rename, edit initial values or delete them there. Renaming updates Ink references; deleting a variable leaves its uses for you to revise.'],
    ['p','File → Open Recent reopens recently opened or saved files. An already open file switches to its tab, preserving unsaved edits. Clear recent files only clears the list. The Start node cannot be deleted; attempts show a message at the bottom.']);
  sections.forEach(([tag,text])=>guide.append(ui(tag,text)));
  for(const text of [
    'Expand Response text and effects to edit a choice’s response. Shared text also appears after choosing. Nested choices stay within their branch; Rejoin / continue marks a gather. Effects execute where they appear, not automatically on node entry.',
    'Drag the inspector divider or focus it and use Up/Down to resize. Home or double-click restores equal halves. Variables, constants and lists have separate sections; lists offer initial-item checkboxes. Deletion asks for confirmation and warns about references.',
    'Full script keeps an unapplied draft when closed or when switching tabs. Apply changes before saving. Closing a file or the app warns about drafts. Drafts are not a disk backup.',
    'Enter finishes a single-line edit and Escape cancels it. In the multiline inspector, Ctrl+Enter finishes and Escape restores the text from when editing began. Ctrl+A selects nodes on the canvas and text in editors.',
    'Search shows matches; Enter/Shift+Enter or the arrow buttons move between them. Open Recent lets you remove one entry or locate a moved file. Use the pencil button to rename nodes and zones.'
  ])guide.append(ui('p',text));
  const hotkeys=createGuide('hotkeys-guide','Inkblots · Hotkeys');
  hotkeys.append(ui('p','On macOS, use Cmd instead of Ctrl (tab switching uses Ctrl). Text fields keep their normal editing shortcuts.'));
  const table=document.createElement('table');
  const head=document.createElement('tr');head.append(ui('th','Shortcut'),ui('th','Action'));table.append(head);
  const rows=[['Ctrl+N','New file'],['Ctrl+O','Open'],['Ctrl+S','Save'],['Ctrl+Shift+S','Save as…'],['Ctrl+W','Close tab'],['Alt+F4','Close Inkblots'],['Ctrl+Z','Undo'],['Ctrl+Shift+Z / Ctrl+Y','Redo'],['Ctrl+X / Ctrl+C / Ctrl+V','Cut / Copy / Paste'],['Ctrl+A','Select all'],['Ctrl+F','Find knot'],['Ctrl+L','Tidy layout'],['Ctrl+E','Full script'],['Ctrl+Enter','Play'],['Ctrl+G','Group selected nodes'],['Shift + left drag','Box select'],['Shift+A / right-click empty space','Insert Ink at cursor…'],['Delete / Backspace','Delete selected nodes'],['Ctrl+Tab / Ctrl+Shift+Tab','Next tab / Previous tab'],['Ctrl++ / Ctrl+-','Zoom interface in / out'],['Ctrl+0','Reset interface zoom'],['F11','Full screen'],['F5 / Ctrl+R','Reload'],['Ctrl+Shift+I','Developer tools'],['F10 / Alt+F','Focus menu bar'],['Escape','Dismiss menu or dialog'],['Arrow keys','Navigate minimap']];
  rows.push(['Enter / Shift+Enter','Next / previous search match'],['Up / Down / Home','Resize / reset inspector split'],['Ctrl+Enter (inspector)','Finish script editing'],['Escape (editor)','Cancel current edit']);
  rows.forEach(([key,action])=>{const row=document.createElement('tr');row.append(ui('td',key),ui('td',action));table.append(row);});hotkeys.append(table);
  window.showInkblotsGuide=()=>{if(!guide.open)guide.showModal();};
  window.showInkblotsHotkeys=()=>{if(!hotkeys.open)hotkeys.showModal();};
})();
