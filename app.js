const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const toast=msg=>{const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1600)};
let selected='gate',zoom=100,dragging=null,offset={x:0,y:0};
function selectNode(node){$$('.node').forEach(n=>n.classList.remove('selected'));node.classList.add('selected');selected=node.dataset.node;$('#inspectorTitle').textContent=node.querySelector('h3').textContent;$('#titleInput').value=node.querySelector('h3').textContent}
function wireNode(node){node.addEventListener('click',e=>{e.stopPropagation();selectNode(node)});node.addEventListener('pointerdown',e=>{dragging=node;const r=node.getBoundingClientRect();offset={x:e.clientX-r.left,y:e.clientY-r.top};node.setPointerCapture(e.pointerId)})}
$$('.node').forEach(wireNode);
document.addEventListener('pointermove',e=>{if(!dragging)return;const box=$('#mapCanvas').getBoundingClientRect();dragging.style.left=(e.clientX-box.left-offset.x)+'px';dragging.style.top=(e.clientY-box.top-offset.y)+'px'});document.addEventListener('pointerup',()=>dragging=null);
$('#titleInput').addEventListener('input',e=>{const n=document.querySelector(`[data-node="${selected}"]`);if(n){n.querySelector('h3').textContent=e.target.value;toast('Title updated')}});
function addNode(){const id='new-'+Date.now(),n=document.createElement('div');n.className='node dialogue-node selected';n.dataset.node=id;n.style.left='33%';n.style.top='58%';n.innerHTML='<div class="node-head"><span class="node-type purple">DIALOGUE</span><span class="node-menu">•••</span></div><h3>New knot</h3><p>Write your scene here.</p><div class="node-foot"><span>0 choices</span><span class="port"></span></div>';$('#mapCanvas').appendChild(n);wireNode(n);selectNode(n);toast('Node added to story map')}
$('#addNodeBtn').onclick=addNode;$('#canvasAdd').onclick=addNode;
function setZoom(v){zoom=Math.max(70,Math.min(130,v));$('#zoomValue').textContent=zoom+'%';$('.grid-lines').style.backgroundSize=(26*zoom/100)+'px '+(26*zoom/100)+'px';toast('Canvas zoom '+zoom+'%')}
$('#zoomIn').onclick=()=>setZoom(zoom+10);$('#zoomOut').onclick=()=>setZoom(zoom-10);$('#fitBtn').onclick=()=>setZoom(100);
$('#playBtn').onclick=()=>$('#playOverlay').classList.add('open');$('#closePlay').onclick=()=>$('#playOverlay').classList.remove('open');$('#playOverlay').addEventListener('click',e=>{if(e.target.id==='playOverlay')e.currentTarget.classList.remove('open')});
const inkSource=`// Moonlit Garden

=== intro ===
The garden is quiet tonight.

+ [Take the path]
    -> garden_gate
+ [Knock on the gate]
    -> garden_gate

=== garden_gate ===
Choose how to enter the garden.

+ [Follow the moth]
    Moth: You found the light.
    -> observatory

=== observatory ===
Stars, stories, and a secret.
-> END`;
$('#scriptInput').value=inkSource;
function setView(view){const canvas=$('.canvas-panel'),inspector=$('.inspector'),script=$('#scriptView');canvas.style.display=view==='script'?'none':'';inspector.style.display=view==='script'?'none':'';script.style.display=view==='script'?'flex':'none';if(view==='script')toast('Script view active')}
$$('.view-tab').forEach(tab=>tab.onclick=()=>{$$('.view-tab').forEach(t=>t.classList.remove('active'));tab.classList.add('active');if(tab.dataset.view==='preview'){$('#playOverlay').classList.add('open');setView('map')}else setView(tab.dataset.view)});
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();toast('Command palette is ready')}if(e.key==='Escape')$('#playOverlay').classList.remove('open')});
