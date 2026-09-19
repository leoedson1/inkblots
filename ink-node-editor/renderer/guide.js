(() => {
  const dialog = document.createElement('dialog'); dialog.id = 'user-guide';
  dialog.setAttribute('aria-labelledby', 'guide-title');
  dialog.innerHTML = `<header><h2 id="guide-title">Inkblots · Quick guide</h2><button class="btn" autofocus>Close</button></header>
  <p>Write branching stories in Ink, arrange them as a graph, and play them as you go.</p>
  <h3>Start a story</h3><p>Use File → New file (Ctrl+N) or Open (Ctrl+O). Try Ink → Full stories → The Lantern Archive for a guided example. Each file has its own tab; closing the last tab opens the welcome screen.</p>
  <h3>Write and connect</h3><p>Click a node to edit its name and Ink text in Properties. Knots are scenes; stitches are sections inside them. A divert (<code>-> scene</code>) connects scenes. Choices use <code>*</code> once or <code>+</code> repeatedly. Ink menu entries explain their syntax on hover.</p>
  <p>Press Shift+A over the canvas, or right-click empty space, to search and insert Ink snippets, zones, or sticky notes at the cursor. Story → Full script (Ctrl+E) edits the whole source.</p>
  <h3>Arrange your canvas</h3><p>Drag a node to move it. Shift + left-button drag draws a selection box; drag any selected node to move the selection. Ctrl+G groups selected nodes immediately. Double-click a zone name to rename it; drag its header to move its members. Its + and − buttons add or remove selected members. Zones expand to keep members inside.</p>
  <p>Story → Sticky note adds an editable canvas note. Drag its header to move it, its corner to resize it, or its dot to change color. Removing a zone keeps its nodes. Use the bottom-left minimap to navigate, View → Fit graph to see everything, or Story → Tidy layout (Ctrl+L) to rearrange nodes.</p>
  <h3>Comments and playtesting</h3><p>Write <code>// a comment</code> or <code>/* a longer comment */</code> in Ink. Hover or focus a node’s balloon to read its comments with separators. Comments are author notes, not story dialogue.</p>
  <p>Story → Play (Ctrl+Enter) runs the story and presents its choices. “Play from here” starts at the selected knot. Check Problems for compiler errors. The Lantern Archive demonstrates variables, lists, conditions, choices, gathers, stitches, functions, tunnels, tags and text variations.</p>
  <h3>Save and recover</h3><p>Ctrl+S saves; Ctrl+Shift+S saves a copy under a new name. Graph edits support Ctrl+Z and Ctrl+Shift+Z; text fields use normal text undo. Node positions, zones and sticky notes are saved as safe comments inside the .ink file. Save before closing; unsaved files offer Save, Don’t Save and Cancel.</p>
  <p>Help → Ink writing guide opens the language reference. On macOS, use Cmd for the Ctrl shortcuts.</p>`;
  document.body.appendChild(dialog);
  dialog.querySelector('button').onclick = () => dialog.close();
  // Keep canvas shortcuts from editing the document while reading the modal.
  dialog.addEventListener('keydown', e => e.stopPropagation());
  window.showInkblotsGuide = () => { if (!dialog.open) dialog.showModal(); };
})();
