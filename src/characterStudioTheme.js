// Character Studio theme injected only while the wardrobe exists.
export function injectCharacterStudioStyles() {
  if (document.getElementById('zw-character-studio-style')) return;
  const style = document.createElement('style');
  style.id = 'zw-character-studio-style';
  style.textContent = `
  #creator .panel.studio-panel{width:min(1180px,96vw);height:min(760px,94vh);max-height:94vh;gap:18px;padding:18px;background:linear-gradient(145deg,#11121b,#191927 58%,#11131c)}
  #creator .studio-panel #creator-left{flex:0 0 43%;min-width:320px}#creator .studio-panel #creator-right{min-width:0;overflow:hidden;padding:12px;border:1px solid #ffffff14;border-radius:16px;background:#08090f59}
  #creator-canvas-wrap{box-shadow:inset 0 0 50px #0007,0 12px 40px #0005}#creator-canvas-wrap .turn{z-index:14;padding:4px 10px;border-radius:999px;background:#06070cb8;color:#c8cad8}
  #creator-canvas-wrap[data-character-studio="active"] canvas:not(.zw-studio-canvas){visibility:hidden!important;pointer-events:none!important}
  .zw-studio-canvas{position:absolute;inset:0;z-index:10;width:100%;height:100%;touch-action:none;cursor:grab;image-rendering:auto;transform:translateZ(0);backface-visibility:hidden}.zw-studio-canvas.dragging{cursor:grabbing}
  .zw-studio-loading{position:absolute;inset:auto 12px 12px;z-index:15;padding:8px 10px;border:1px solid #ffffff1f;border-radius:10px;background:#08090fd1;color:#bfc6d8;font-size:12px}
  .zw-studio-head{display:flex;justify-content:space-between;gap:12px;margin-bottom:10px}.zw-studio-head h2{margin:0;font-size:20px}.zw-studio-head p{margin:4px 0 0;color:#9399ad;font-size:12px}
  .zw-studio-status{height:max-content;padding:5px 8px;border:1px solid #4eff913d;border-radius:999px;background:#4eff9114;color:#59f49a;font-size:10px;letter-spacing:.9px;text-transform:uppercase;white-space:nowrap}
  .zw-studio-tabs{display:flex;gap:6px;overflow-x:auto;padding:2px 2px 9px}.zw-studio-tab,.zw-mini-btn{border:1px solid #ffffff21;background:#242535;color:#e0e2ed;font-weight:750;cursor:pointer}
  .zw-studio-tab{padding:8px 12px;border-radius:999px;font-size:12px;white-space:nowrap}.zw-studio-tab.active,.zw-mini-btn.primary{border-color:#4eff91;background:#4eff91;color:#06210f}
  .zw-studio-body{height:calc(100% - 104px);overflow-y:auto;padding:4px 5px 12px 2px}.zw-section{margin:0 0 16px}.zw-section-title{display:flex;justify-content:space-between;margin-bottom:8px}.zw-section-title h3{margin:0;color:#aab0c4;font-size:12px;letter-spacing:1.1px;text-transform:uppercase}.zw-section-title small{color:#71788d;font-size:10px}
  .zw-card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:8px}.zw-item-card{min-height:88px;overflow:hidden;padding:10px;border:1px solid #ffffff1a;border-radius:13px;background:#202130;color:#e6e8f2;text-align:left;cursor:pointer;transition:.14s}.zw-item-card:hover{transform:translateY(-1px);border-color:#616b8d}.zw-item-card.active{border-color:#4eff91;background:#183027;box-shadow:inset 0 0 0 1px #4eff9140}.zw-item-card.disabled{opacity:.45;cursor:not-allowed}
  .zw-item-thumb{height:42px;margin:-10px -10px 8px;border-bottom:1px solid #ffffff14;background-color:#2c2d3e;background-position:center;background-size:cover}.zw-item-name{font-size:12px;font-weight:800}.zw-owned{margin-top:4px;color:#59f49a;font-size:9px;letter-spacing:.7px;text-transform:uppercase}.zw-color-dot{width:26px;height:26px;margin-bottom:8px;border:2px solid #ffffff59;border-radius:50%;box-shadow:0 2px 8px #0005}
  .zw-slider-row{display:grid;grid-template-columns:126px 1fr 44px;gap:10px;align-items:center;padding:8px 2px;border-bottom:1px solid #ffffff0e}.zw-slider-row label{color:#d7d9e4;font-size:12px}.zw-slider-row input{width:100%;accent-color:#4eff91}.zw-slider-value{color:#9fe8ff;font-size:11px;text-align:right}
  .zw-studio-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px;padding-top:10px;border-top:1px solid #ffffff14}.zw-mini-btn{padding:7px 10px;border-radius:9px;font-size:11px}.zw-look-card{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;margin-bottom:8px;padding:11px;border:1px solid #ffffff1a;border-radius:12px;background:#202130}.zw-look-name{font-size:13px;font-weight:800}.zw-look-sub{margin-top:3px;color:#8f96aa;font-size:10px}.zw-look-actions{display:flex;gap:5px}.zw-empty{padding:24px 12px;border:1px dashed #ffffff21;border-radius:12px;color:#868da2;text-align:center}
  @media(max-width:780px){#creator .panel.studio-panel{height:96vh;overflow-y:auto;flex-direction:column}#creator .studio-panel #creator-left{width:100%;min-width:0;flex:0 0 45vh}#creator .studio-panel #creator-right{min-height:520px}.zw-slider-row{grid-template-columns:100px 1fr 40px}}
  `;
  document.head.appendChild(style);
}
