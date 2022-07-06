(function(){var t={8143:function(t,e,i){"use strict";i.r(e);var s=i(8081),n=i.n(s),a=i(3645),l=i.n(a),r=l()(n());r.push([t.id,".block[data-v-ce0d7f5e]{height:100%;width:100%;background-color:aqua;display:flex;flex-direction:column;justify-content:center;align-items:center}",""]),e["default"]=r},3824:function(t,e,i){"use strict";i.r(e);var s=i(8081),n=i.n(s),a=i(3645),l=i.n(a),r=l()(n());r.push([t.id,"body,html{height:100%;width:100%;margin:0;padding:0;overflow:auto}.container{border:1px solid #ddd;background:#fff;color:#333;margin:10px}#block1,.container{width:300px;height:300px;display:inline-block;float:left}#block1{border:1px solid #000}.resizable{background-position:0 0;width:150px;height:150px;padding:0;border:1px solid #003eff;background:#007fff;font-weight:400;color:#fff;position:relative}.table-block{display:table}.table-row{display:table-row;text-align:center}.table-cell{width:50%;display:inline-block}.table-input{width:50px}.drag-container-1,.drag-container-2{width:100%;height:20px;background:red;color:#fff;text-align:center;cursor:pointer}.table-container{flex:1;width:100%;display:flex;flex-direction:column;justify-content:center;align-items:center}",""]),e["default"]=r},4944:function(t,e,i){"use strict";i.r(e);var s=i(8081),n=i.n(s),a=i(3645),l=i.n(a),r=l()(n());r.push([t.id,".resizable-component[data-v-3de5149f]{position:relative}.resizable-component>.resizable-r[data-v-3de5149f]{z-index:90;cursor:e-resize;top:0;height:100%}.resizable-component>.resizable-r[data-v-3de5149f],.resizable-component>.resizable-rb[data-v-3de5149f]{display:block;position:absolute;touch-action:none;user-select:none;-moz-user-select:none;-webkit-user-select:none;width:12px;right:-6px}.resizable-component>.resizable-rb[data-v-3de5149f]{cursor:se-resize;height:12px;bottom:-6px;z-index:91}.resizable-component>.resizable-b[data-v-3de5149f]{z-index:90;cursor:s-resize;width:100%;left:0}.resizable-component>.resizable-b[data-v-3de5149f],.resizable-component>.resizable-lb[data-v-3de5149f]{display:block;position:absolute;touch-action:none;user-select:none;-moz-user-select:none;-webkit-user-select:none;height:12px;bottom:-6px}.resizable-component>.resizable-lb[data-v-3de5149f]{cursor:sw-resize;width:12px;left:-6px;z-index:91}.resizable-component>.resizable-l[data-v-3de5149f]{z-index:90;cursor:w-resize;height:100%;top:0}.resizable-component>.resizable-l[data-v-3de5149f],.resizable-component>.resizable-lt[data-v-3de5149f]{display:block;position:absolute;touch-action:none;user-select:none;-moz-user-select:none;-webkit-user-select:none;width:12px;left:-6px}.resizable-component>.resizable-lt[data-v-3de5149f]{cursor:nw-resize;height:12px;top:-6px;z-index:91}.resizable-component>.resizable-t[data-v-3de5149f]{z-index:90;cursor:n-resize;width:100%;left:0}.resizable-component>.resizable-rt[data-v-3de5149f],.resizable-component>.resizable-t[data-v-3de5149f]{display:block;position:absolute;touch-action:none;user-select:none;-moz-user-select:none;-webkit-user-select:none;height:12px;top:-6px}.resizable-component>.resizable-rt[data-v-3de5149f]{cursor:ne-resize;width:12px;right:-6px;z-index:91}",""]),e["default"]=r},9122:function(t,e,i){"use strict";var s=i(9242),n=i(3396),a=i(7139);const l=t=>((0,n.dD)("data-v-ce0d7f5e"),t=t(),(0,n.Cn)(),t),r={class:"container"},h={class:"block"},o=l((()=>(0,n._)("div",{class:"drag-container-1"},[(0,n._)("span",null,"drag_1")],-1))),d={class:"table-container"},c=l((()=>(0,n._)("div",{class:"drag-container-2"},"drag_2",-1))),u={class:"container table-block"},m={class:"table-row"},p=l((()=>(0,n._)("div",null,[(0,n._)("h4",null,"handlers:")],-1))),f=["value"],b={class:"table-row"},v={class:"table-cell"},g=(0,n.Uk)(" minWidth:"),w={class:"table-cell"},z=(0,n.Uk)(" maxWidth:"),x={class:"table-row"},y={class:"table-cell"},_=(0,n.Uk)(" minHeight:"),S={class:"table-cell"},E=(0,n.Uk)(" maxHeight:"),H={class:"table-row"},k={class:"table-cell"},W=(0,n.Uk)(" width:"),M={class:"table-cell"},U=(0,n.Uk)(" height:"),$={class:"table-row"},D={class:"table-cell"},Y=(0,n.Uk)(" left:"),X={class:"table-cell"},L=(0,n.Uk)(" top:"),N={class:"table-row"},O={class:"table-cell"},V=(0,n.Uk)(" fitParent:"),P={class:"table-cell"},j=(0,n.Uk)(" maximize:"),R={class:"table-row",style:{"text-align":"left"}},A={class:"table-cell",style:{padding:"0 20px",width:"100%"}};function C(t,e,i,l,C,T){const Z=(0,n.up)("vue-resizable");return(0,n.wg)(),(0,n.iD)("div",null,[(0,n._)("div",r,[(0,n.Wm)(Z,{class:"resizable",ref:"resizableComponent",dragSelector:C.dragSelector,active:C.handlers,"fit-parent":C.fit,maximize:C.maximize,"max-width":T.checkEmpty(C.maxW),"max-height":T.checkEmpty(C.maxH),"min-width":T.checkEmpty(C.minW),"min-height":T.checkEmpty(C.minH),width:C.width,height:C.height,left:C.left,top:C.top,onMount:T.eHandler,"onResize:move":T.eHandler,"onResize:start":T.eHandler,"onResize:end":T.eHandler,"onDrag:move":T.eHandler,"onDrag:start":T.eHandler,"onDrag:end":T.eHandler,onMaximize:T.eHandler},{default:(0,n.w5)((()=>[(0,n._)("div",h,[o,(0,n._)("div",d,[(0,n._)("table",null,[(0,n._)("tr",null,[(0,n._)("td",null,"w:"+(0,a.zw)(C.width),1),(0,n._)("td",null,"h:"+(0,a.zw)(C.height),1)]),(0,n._)("tr",null,[(0,n._)("td",null,"l:"+(0,a.zw)(C.left),1),(0,n._)("td",null,"t:"+(0,a.zw)(C.top),1)])])]),c])])),_:1},8,["dragSelector","active","fit-parent","maximize","max-width","max-height","min-width","min-height","width","height","left","top","onMount","onResize:move","onResize:start","onResize:end","onDrag:move","onDrag:start","onDrag:end","onMaximize"])]),(0,n._)("div",u,[(0,n._)("div",m,[p,((0,n.wg)(),(0,n.iD)(n.HY,null,(0,n.Ko)(["r","rb","b","lb","l","lt","t","rt"],(t=>(0,n._)("span",{key:t},[(0,n.Uk)((0,a.zw)(t)+":",1),(0,n.wy)((0,n._)("input",{type:"checkbox","onUpdate:modelValue":e[0]||(e[0]=t=>C.handlers=t),value:t},null,8,f),[[s.e8,C.handlers]])]))),64))]),(0,n._)("div",b,[(0,n._)("div",v,[g,(0,n.wy)((0,n._)("input",{class:"table-input",type:"number","onUpdate:modelValue":e[1]||(e[1]=t=>C.minW=t)},null,512),[[s.nr,C.minW,void 0,{number:!0}]])]),(0,n._)("div",w,[z,(0,n.wy)((0,n._)("input",{class:"table-input",type:"number","onUpdate:modelValue":e[2]||(e[2]=t=>C.maxW=t)},null,512),[[s.nr,C.maxW,void 0,{number:!0}]])])]),(0,n._)("div",x,[(0,n._)("div",y,[_,(0,n.wy)((0,n._)("input",{class:"table-input",type:"number","onUpdate:modelValue":e[3]||(e[3]=t=>C.minH=t)},null,512),[[s.nr,C.minH,void 0,{number:!0}]])]),(0,n._)("div",S,[E,(0,n.wy)((0,n._)("input",{class:"table-input",type:"number","onUpdate:modelValue":e[4]||(e[4]=t=>C.maxH=t)},null,512),[[s.nr,C.maxH,void 0,{number:!0}]])])]),(0,n._)("div",H,[(0,n._)("div",k,[W,(0,n.wy)((0,n._)("input",{class:"table-input",type:"number","onUpdate:modelValue":e[5]||(e[5]=t=>C.width=t)},null,512),[[s.nr,C.width,void 0,{number:!0}]])]),(0,n._)("div",M,[U,(0,n.wy)((0,n._)("input",{class:"table-input",type:"number","onUpdate:modelValue":e[6]||(e[6]=t=>C.height=t)},null,512),[[s.nr,C.height,void 0,{number:!0}]])])]),(0,n._)("div",$,[(0,n._)("div",D,[Y,(0,n.wy)((0,n._)("input",{class:"table-input",type:"number","onUpdate:modelValue":e[7]||(e[7]=t=>C.left=t)},null,512),[[s.nr,C.left,void 0,{number:!0}]])]),(0,n._)("div",X,[L,(0,n.wy)((0,n._)("input",{class:"table-input",type:"number","onUpdate:modelValue":e[8]||(e[8]=t=>C.top=t)},null,512),[[s.nr,C.top,void 0,{number:!0}]])])]),(0,n._)("div",N,[(0,n._)("div",O,[V,(0,n.wy)((0,n._)("input",{type:"checkbox","onUpdate:modelValue":e[9]||(e[9]=t=>C.fit=t)},null,512),[[s.e8,C.fit,void 0,{number:!0}]])]),(0,n._)("div",P,[j,(0,n.wy)((0,n._)("input",{type:"checkbox","onUpdate:modelValue":e[10]||(e[10]=t=>C.maximize=t)},null,512),[[s.e8,C.maximize,void 0,{number:!0}]])])]),(0,n._)("div",R,[(0,n._)("div",A," lastEvent: "+(0,a.zw)(C.event),1)])])])}function T(t,e,i,l,r,h){return(0,n.wg)(),(0,n.iD)("div",{ref:"parent",class:"resizable-component",style:(0,a.j5)(h.style)},[(0,n.WI)(t.$slots,"default",{},void 0,!0),((0,n.wg)(!0),(0,n.iD)(n.HY,null,(0,n.Ko)(i.active,(t=>(0,n.wy)(((0,n.wg)(),(0,n.iD)("div",{key:t,class:(0,a.C_)("resizable-"+t)},null,2)),[[s.F8,!i.maximize]]))),128))],4)}const Z={"resizable-r":{bit:1,cursor:"e-resize"},"resizable-rb":{bit:3,cursor:"se-resize"},"resizable-b":{bit:2,cursor:"s-resize"},"resizable-lb":{bit:6,cursor:"sw-resize"},"resizable-l":{bit:4,cursor:"w-resize"},"resizable-lt":{bit:12,cursor:"nw-resize"},"resizable-t":{bit:8,cursor:"n-resize"},"resizable-rt":{bit:9,cursor:"ne-resize"},"drag-el":{bit:15,cursor:"pointer"}},B={l:1,t:2,w:4,h:8};var q={name:"VResizable",props:{width:{default:void 0,type:[Number,String]},minWidth:{default:0,type:Number},maxWidth:{default:void 0,type:Number},height:{default:void 0,type:[Number,String]},minHeight:{default:0,type:Number},maxHeight:{default:void 0,type:Number},left:{default:0,type:[Number,String]},top:{default:0,type:[Number,String]},active:{default:()=>["r","rb","b","lb","l","lt","t","rt"],validator:t=>["r","rb","b","lb","l","lt","t","rt"].filter((e=>-1!==t.indexOf(e))).length===t.length,type:Array},fitParent:{default:!1,type:Boolean},dragSelector:{default:void 0,type:String},maximize:{default:!1,type:Boolean},disableAttributes:{default:()=>[],validator:t=>["l","t","w","h"].filter((e=>-1!==t.indexOf(e))).length===t.length,type:Array}},emits:["mount","destroy","resize:start","resize:move","resize:end","drag:start","drag:move","drag:end","maximize"],data(){return{w:this.width,h:this.height,minW:this.minWidth,minH:this.minHeight,maxW:this.maxWidth,maxH:this.maxHeight,l:this.left,t:this.top,mouseX:0,mouseY:0,offsetX:0,offsetY:0,parent:{width:0,height:0},resizeState:0,dragElements:[],dragState:!1,calcMap:15}},computed:{style(){return{...this.calcMap&B.w&&{width:"number"===typeof this.w?this.w+"px":this.w},...this.calcMap&B.h&&{height:"number"===typeof this.h?this.h+"px":this.h},...this.calcMap&B.l&&{left:"number"===typeof this.l?this.l+"px":this.l},...this.calcMap&B.t&&{top:"number"===typeof this.t?this.t+"px":this.t}}}},watch:{maxWidth(t){this.maxW=t},maxHeight(t){this.maxH=t},minWidth(t){this.minW=t},minHeight(t){this.minH=t},width(t){"number"===typeof t&&(this.w=t)},height(t){"number"===typeof t&&(this.h=t)},left(t){"number"===typeof t&&(this.l=t)},top(t){"number"===typeof t&&(this.t=t)},dragSelector(t){this.setupDragElements(t)},maximize(t){this.setMaximize(t),this.emitEvent("maximize",{state:t})}},mounted(){this.width?"auto"!==this.width&&"number"!==typeof this.width&&(this.w=this.$el.clientWidth):this.w=this.$el.parentElement.clientWidth,this.height?"auto"!==this.height&&"number"!==typeof this.height&&(this.h=this.$el.clientHeight):this.h=this.$el.parentElement.clientHeight,"number"!==typeof this.left&&(this.l=this.$el.offsetLeft-this.$el.parentElement.offsetLeft),"number"!==typeof this.top&&(this.t=this.$el.offsetTop-this.$el.parentElement.offsetTop),this.minW&&this.w<this.minW&&(this.w=this.minW),this.minH&&this.h<this.minH&&(this.h=this.minH),this.maxW&&this.w>this.maxW&&(this.w=this.maxW),this.maxH&&this.h>this.maxH&&(this.h=this.maxH),this.setMaximize(this.maximize),this.setupDragElements(this.dragSelector),this.disableAttributes.forEach((t=>{switch(t){case"l":this.calcMap&=~B.l;break;case"t":this.calcMap&=~B.t;break;case"w":this.calcMap&=~B.w;break;case"h":this.calcMap&=~B.h}})),document.documentElement.addEventListener("mousemove",this.handleMove,!0),document.documentElement.addEventListener("mousedown",this.handleDown,!0),document.documentElement.addEventListener("mouseup",this.handleUp,!0),document.documentElement.addEventListener("touchmove",this.handleMove,!0),document.documentElement.addEventListener("touchstart",this.handleDown,!0),document.documentElement.addEventListener("touchend",this.handleUp,!0),this.emitEvent("mount")},beforeUnmount(){document.documentElement.removeEventListener("mousemove",this.handleMove,!0),document.documentElement.removeEventListener("mousedown",this.handleDown,!0),document.documentElement.removeEventListener("mouseup",this.handleUp,!0),document.documentElement.removeEventListener("touchmove",this.handleMove,!0),document.documentElement.removeEventListener("touchstart",this.handleDown,!0),document.documentElement.removeEventListener("touchend",this.handleUp,!0),this.emitEvent("destroy")},methods:{setMaximize(t){const e=this.$el.parentElement;t?(this.prevState={w:this.w,h:this.h,l:this.l,t:this.t},this.t=this.l=0,this.w=e.clientWidth,this.h=e.clientHeight):this.restoreSize()},restoreSize(){this.prevState&&(this.l=this.prevState.l,this.t=this.prevState.t,this.h=this.prevState.h,this.w=this.prevState.w)},setupDragElements(t){const e=this.$el.querySelectorAll(".drag-el");e.forEach((t=>{t.classList.remove("drag-el")}));const i=this.$el.querySelectorAll(t);i.forEach((t=>{t.classList.add("drag-el")})),this.dragElements=Array.prototype.slice.call(i)},emitEvent(t,e){this.$emit(t,{eventName:t,left:this.l,top:this.t,width:this.w,height:this.h,cmp:this,...e})},handleMove(t){if(0!==this.resizeState){let e,i;if(this.dragState||(isNaN(this.w)&&(this.w=this.$el.clientWidth),isNaN(this.h)&&(this.h=this.$el.clientHeight)),t.touches&&t.touches.length>=0?(e=t.touches[0].clientY,i=t.touches[0].clientX):(e=t.clientY,i=t.clientX),this.maximize&&this.prevState){const t=this.parent.width,s=this.parent.height;this.restoreSize(),this.prevState=void 0,this.t=e>s/2?s-this.h:0,this.l=i>t/2?t-this.w:0,this.emitEvent("maximize",{state:!1})}let s=i-this.mouseX+this.offsetX,n=e-this.mouseY+this.offsetY;if(this.$el.getBoundingClientRect){const t=this.$el.getBoundingClientRect(),e=t.width/this.$el.offsetWidth||1,i=t.height/this.$el.offsetHeight||1;s/=e,n/=i}this.offsetX=this.offsetY=0,this.resizeState&Z["resizable-r"].bit&&(!this.dragState&&this.w+s<this.minW?this.offsetX=s-(s=this.minW-this.w):!this.dragState&&this.maxW&&this.w+s>this.maxW&&(!this.fitParent||this.w+this.l<this.parent.width)?this.offsetX=s-(s=this.maxW-this.w):this.fitParent&&this.l+this.w+s>this.parent.width&&(this.offsetX=s-(s=this.parent.width-this.l-this.w)),this.calcMap&B.w&&(this.w+=this.dragState?0:s)),this.resizeState&Z["resizable-b"].bit&&(!this.dragState&&this.h+n<this.minH?this.offsetY=n-(n=this.minH-this.h):!this.dragState&&this.maxH&&this.h+n>this.maxH&&(!this.fitParent||this.h+this.t<this.parent.height)?this.offsetY=n-(n=this.maxH-this.h):this.fitParent&&this.t+this.h+n>this.parent.height&&(this.offsetY=n-(n=this.parent.height-this.t-this.h)),this.calcMap&B.h&&(this.h+=this.dragState?0:n)),this.resizeState&Z["resizable-l"].bit&&(!this.dragState&&this.w-s<this.minW?this.offsetX=s-(s=this.w-this.minW):!this.dragState&&this.maxW&&this.w-s>this.maxW&&this.l>=0?this.offsetX=s-(s=this.w-this.maxW):this.fitParent&&this.l+s<0&&(this.offsetX=s-(s=-this.l)),this.calcMap&B.l&&(this.l+=s),this.calcMap&B.w&&(this.w-=this.dragState?0:s)),this.resizeState&Z["resizable-t"].bit&&(!this.dragState&&this.h-n<this.minH?this.offsetY=n-(n=this.h-this.minH):!this.dragState&&this.maxH&&this.h-n>this.maxH&&this.t>=0?this.offsetY=n-(n=this.h-this.maxH):this.fitParent&&this.t+n<0&&(this.offsetY=n-(n=-this.t)),this.calcMap&B.t&&(this.t+=n),this.calcMap&B.h&&(this.h-=this.dragState?0:n)),this.mouseX=i,this.mouseY=e;const a=this.dragState?"drag:move":"resize:move";this.emitEvent(a)}},handleDown(t){if(!t.target.closest||t.target.closest(".resizable-component")===this.$refs["parent"])for(let e in Z)if(this.$el.contains(t.target)&&(t.target.closest&&t.target.closest(`.${e}`)||t.target.classList.contains(e))){"drag-el"===e&&(this.dragState=!0),document.body.style.cursor=Z[e].cursor,t.touches&&t.touches.length>=1?(this.mouseX=t.touches[0].clientX,this.mouseY=t.touches[0].clientY):(t.preventDefault&&t.preventDefault(),this.mouseX=t.clientX,this.mouseY=t.clientY),this.offsetX=this.offsetY=0,this.resizeState=Z[e].bit,this.parent.height=this.$el.parentElement.clientHeight,this.parent.width=this.$el.parentElement.clientWidth;const i=this.dragState?"drag:start":"resize:start";this.emitEvent(i);break}},handleUp(){if(0!==this.resizeState){this.resizeState=0,document.body.style.cursor="";const t=this.dragState?"drag:end":"resize:end";this.emitEvent(t),this.dragState=!1}}}},I=(i(6457),i(89));const F=(0,I.Z)(q,[["render",T],["__scopeId","data-v-3de5149f"]]);var K=F,G={name:"App",components:{VueResizable:K},data(){const t=150,e=150;return{handlers:["r","rb","b","lb","l","lt","t","rt"],left:`calc( 50% - ${t/2}px)`,top:`calc(50% - ${e/2}px)`,height:e,width:t,maxW:250,maxH:250,minW:100,minH:100,fit:!0,maximize:!1,event:"",dragSelector:".drag-container-1, .drag-container-2"}},methods:{eHandler(t){this.width=t.width,this.height=t.height,this.left=t.left,this.top=t.top,this.event=t.eventName,"maximize"===t.eventName&&(this.maximize=t.state)},checkEmpty(t){return"number"!==typeof t?0:t}},filters:{checkEmpty(t){return"number"!==typeof t?0:t}}};i(3482),i(8509);const J=(0,I.Z)(G,[["render",C],["__scopeId","data-v-ce0d7f5e"]]);var Q=J;(0,s.ri)(Q).mount("#app")},3482:function(t,e,i){var s=i(8143);s.__esModule&&(s=s.default),"string"===typeof s&&(s=[[t.id,s,""]]),s.locals&&(t.exports=s.locals);var n=i(7037).Z;n("868f5342",s,!0,{sourceMap:!1,shadowMode:!1})},8509:function(t,e,i){var s=i(3824);s.__esModule&&(s=s.default),"string"===typeof s&&(s=[[t.id,s,""]]),s.locals&&(t.exports=s.locals);var n=i(7037).Z;n("c03ee4ea",s,!0,{sourceMap:!1,shadowMode:!1})},6457:function(t,e,i){var s=i(4944);s.__esModule&&(s=s.default),"string"===typeof s&&(s=[[t.id,s,""]]),s.locals&&(t.exports=s.locals);var n=i(7037).Z;n("5aabc128",s,!0,{sourceMap:!1,shadowMode:!1})}},e={};function i(s){var n=e[s];if(void 0!==n)return n.exports;var a=e[s]={id:s,exports:{}};return t[s](a,a.exports,i),a.exports}i.m=t,function(){var t=[];i.O=function(e,s,n,a){if(!s){var l=1/0;for(d=0;d<t.length;d++){s=t[d][0],n=t[d][1],a=t[d][2];for(var r=!0,h=0;h<s.length;h++)(!1&a||l>=a)&&Object.keys(i.O).every((function(t){return i.O[t](s[h])}))?s.splice(h--,1):(r=!1,a<l&&(l=a));if(r){t.splice(d--,1);var o=n();void 0!==o&&(e=o)}}return e}a=a||0;for(var d=t.length;d>0&&t[d-1][2]>a;d--)t[d]=t[d-1];t[d]=[s,n,a]}}(),function(){i.n=function(t){var e=t&&t.__esModule?function(){return t["default"]}:function(){return t};return i.d(e,{a:e}),e}}(),function(){i.d=function(t,e){for(var s in e)i.o(e,s)&&!i.o(t,s)&&Object.defineProperty(t,s,{enumerable:!0,get:e[s]})}}(),function(){i.g=function(){if("object"===typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(t){if("object"===typeof window)return window}}()}(),function(){i.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)}}(),function(){i.r=function(t){"undefined"!==typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})}}(),function(){var t={143:0};i.O.j=function(e){return 0===t[e]};var e=function(e,s){var n,a,l=s[0],r=s[1],h=s[2],o=0;if(l.some((function(e){return 0!==t[e]}))){for(n in r)i.o(r,n)&&(i.m[n]=r[n]);if(h)var d=h(i)}for(e&&e(s);o<l.length;o++)a=l[o],i.o(t,a)&&t[a]&&t[a][0](),t[a]=0;return i.O(d)},s=self["webpackChunkvue_resizable"]=self["webpackChunkvue_resizable"]||[];s.forEach(e.bind(null,0)),s.push=e.bind(null,s.push.bind(s))}();var s=i.O(void 0,[998],(function(){return i(9122)}));s=i.O(s)})();
//# sourceMappingURL=app.1375d5e2.js.map