import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{At as t,Dt as n,E as r,G as i,H as a,I as o,K as s,N as c,O as l,U as u,W as d,Y as f,_ as p,bt as m,ct as h,g,h as _,k as v,kt as y,p as b,st as x,vt as S,w as C,yt as w,zt as T}from"./Stack-BLkBccmD.js";var E=e(T(),1);function D(e){let{focusableWhenDisabled:t,disabled:n,composite:r=!1,tabIndex:i=0,isNativeButton:a}=e,o=r&&t!==!1,s=r&&t===!1;return E.useMemo(()=>{let e={onKeyDown(e){n&&t&&e.key!==`Tab`&&e.preventDefault()}};return r||(e.tabIndex=i,!a&&n&&(e.tabIndex=t?i:-1)),(a&&(t||o)||!a&&n)&&(e[`aria-disabled`]=n),a&&(!t||s)&&(e.disabled=n),e},[r,n,t,o,s,a,i])}var O={};function k(e){let{nativeButton:t,nativeButtonProp:n,internalNativeButton:r=t,allowInferredHostMismatch:i=!1,disabled:a,type:o,hasFormAction:s=!1,tabIndex:c=0,focusableWhenDisabled:l,stopEventPropagation:u=!1,onBeforeKeyDown:d,onBeforeKeyUp:f}=e,p=E.useRef(null),m=l===!0,h=D({focusableWhenDisabled:m,disabled:a,isNativeButton:t,tabIndex:c}),g=E.useCallback(()=>{let e=p.current;return e==null?t:e.tagName===`BUTTON`||!!(e.tagName===`A`&&e.href)},[t]),_=E.useMemo(()=>{let e=m?{}:{tabIndex:a?-1:c};return t?(e.type=o===void 0&&!s?`button`:o,m||(e.disabled=a)):(e.role=`button`,!m&&a&&(e[`aria-disabled`]=a)),m?{...e,...h}:e},[a,m,h,s,t,c,o]);return{getButtonProps:E.useCallback((e=O)=>{let{onClick:t,onKeyDown:n,onKeyUp:r,...i}=e,o=e=>{u&&e.stopPropagation(),a?e.preventDefault():t?.(e)},s=e=>{m&&h.onKeyDown(e),a||(d?.(e),n?.(e),e.target!==e.currentTarget||g()||(e.key===` `?e.preventDefault():e.key===`Enter`&&(e.preventDefault(),e.currentTarget.click())))},c=e=>{a||(f?.(e),r?.(e),e.target===e.currentTarget&&!g()&&e.key===` `&&!e.defaultPrevented&&e.currentTarget.click())};return{..._,...i,onClick:o,onKeyDown:s,onKeyUp:c}},[_,a,m,h,g,d,f,u]),rootRef:p}}var A=class e{ref={current:null};shouldMount=!1;mounted=null;didMount=!1;setShouldMount=null;static create(){return new e}static use(){let t=r(e.create).current,[n,i]=E.useState(!1);return t.shouldMount=n,t.setShouldMount=i,E.useEffect(t.mountEffect,[n]),t}mount(){return this.mounted||(this.mounted=M(),this.shouldMount=!0,this.setShouldMount(this.shouldMount)),this.mounted}mountEffect=()=>{this.shouldMount&&!this.didMount&&(this.ref.current!==null&&(this.didMount=!0),this.mounted.resolve())};start(...e){this.mount().then(()=>this.ref.current?.start(...e))}stop(...e){this.mount().then(()=>this.ref.current?.stop(...e))}pulsate(...e){this.mount().then(()=>this.ref.current?.pulsate(...e))}};function j(){return A.use()}function M(){let e,t,n=new Promise((n,r)=>{e=n,t=r});return n.resolve=e,n.reject=t,n}var N=n();function P(e){let{className:t,classes:n,pulsate:r=!1,rippleX:i,rippleY:a,rippleSize:o,in:s,onExited:c,timeout:l}=e,[u,d]=E.useState(!1),f=_(),p=E.useRef(!1),h=E.useRef(c);h.current=c;let g=c!=null,v=m(t,n.ripple,n.rippleVisible,r&&n.ripplePulsate),y={width:o,height:o,top:-(o/2)+a,left:-(o/2)+i},b=m(n.child,u&&n.childLeaving,r&&n.childPulsate);return!s&&!u&&d(!0),E.useEffect(()=>{!s&&g?p.current||(p.current=!0,f.start(l,()=>{p.current=!1,h.current?.()})):(p.current=!1,f.clear())},[f,g,s,l]),(0,N.jsx)(`span`,{className:v,style:y,children:(0,N.jsx)(`span`,{className:b})})}var F=S(`MuiTouchRipple`,[`root`,`ripple`,`rippleVisible`,`ripplePulsate`,`child`,`childLeaving`,`childPulsate`]),I=550,L={},R=[],ee=()=>{};function z(e,t){let n=new Set(t),r=new Map,i=[];for(let t of e)n.has(t)?i.length>0&&(r.set(t,i),i=[]):i.push(t);let a=[];for(let e of t){let t=r.get(e);t&&a.push(...t),a.push(e)}return a.push(...i),a}function te({event:e,element:t,center:n}){let r=t?t.getBoundingClientRect():{width:0,height:0,left:0,top:0},i,a;if(n||e===void 0||e.clientX===0&&e.clientY===0||!e.clientX&&!e.touches)i=Math.round(r.width/2),a=Math.round(r.height/2);else{let{clientX:t,clientY:n}=e.touches&&e.touches.length>0?e.touches[0]:e;i=Math.round(t-r.left),a=Math.round(n-r.top)}let o;if(n)o=Math.sqrt((2*r.width**2+r.height**2)/3),o%2==0&&(o+=1);else{let e=Math.max(Math.abs((t?t.clientWidth:0)-i),i)*2+2,n=Math.max(Math.abs((t?t.clientHeight:0)-a),a)*2+2;o=Math.sqrt(e**2+n**2)}return{rippleX:i,rippleY:a,rippleSize:o}}var B=t`
  0% {
    transform: scale(0);
    opacity: 0.1;
  }

  100% {
    transform: scale(1);
    opacity: 0.3;
  }
`,ne=t`
  0% {
    opacity: 1;
  }

  100% {
    opacity: 0;
  }
`,re=t`
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(0.92);
  }

  100% {
    transform: scale(1);
  }
`;function V(e){if(e.motion.reducedMotion===`always`)return null;let t=y`
    &.${F.rippleVisible} {
      animation-name: ${B};
      animation-duration: ${I}ms;
      animation-timing-function: ${e.transitions.easing.easeInOut};
    }

    &.${F.ripplePulsate} {
      animation-duration: ${e.transitions.duration.shorter}ms;
    }

    & .${F.childLeaving} {
      animation-name: ${ne};
      animation-duration: ${I}ms;
      animation-timing-function: ${e.transitions.easing.easeInOut};
    }

    & .${F.childPulsate} {
      animation-name: ${re};
      animation-duration: 2500ms;
      animation-timing-function: ${e.transitions.easing.easeInOut};
      animation-iteration-count: infinite;
      animation-delay: 200ms;
    }
  `;return e.motion.reducedMotion===`system`?y`
      @media (prefers-reduced-motion: no-preference) {
        ${t}
      }
    `:t}var H=s(`span`,{name:`MuiTouchRipple`,slot:`Root`})({overflow:`hidden`,pointerEvents:`none`,position:`absolute`,zIndex:0,top:0,right:0,bottom:0,left:0,borderRadius:`inherit`}),U=s(P,{name:`MuiTouchRipple`,slot:`Ripple`})`
  opacity: 0;
  position: absolute;

  &.${F.rippleVisible} {
    opacity: 0.3;
    transform: scale(1);
  }

  /*
   * Order matters: 'child', 'childLeaving' and 'childPulsate' apply to the same
   * element with equal specificity, so the later rule wins. 'child' must come
   * before 'childLeaving' so the leaving 'opacity: 0' takes precedence. A focus
   * (pulsate) ripple keeps 'pulsateKeyframe' (no opacity animation) on exit, so
   * it relies on this static 'opacity: 0' to disappear on blur instead of
   * lingering until removal.
   */
  & .${F.child} {
    opacity: 1;
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-color: currentColor;
  }

  & .${F.childLeaving} {
    opacity: 0;
  }

  & .${F.childPulsate} {
    position: absolute;
    /* @noflip */
    left: 0px;
    top: 0;
  }

  ${({theme:e})=>V(e)}
`,ie=E.forwardRef(function(e,t){let n=d({props:e,name:`MuiTouchRipple`}),r=f(),i=C(r.motion.reducedMotion,!1),{center:a=!1,classes:o=L,className:s,...c}=n,[u,p]=E.useState({items:R,order:R}),h=u.items,v=E.useRef(0),y=E.useRef(null),b=E.useRef(!1);g(()=>(b.current=!0,()=>{b.current=!1})),E.useEffect(()=>{y.current&&=(y.current(),null)},[h]);let x=E.useRef(!1),S=_(),w=E.useRef(null),T=E.useRef(null),D=l(e=>{b.current&&p(t=>{let n=t.items.filter(t=>t.key!==e);return{items:n,order:z(t.order.filter(t=>t!==e),n.filter(e=>!e.exiting).map(e=>e.key))}})}),O=l(e=>{let{pulsate:t,rippleX:n,rippleY:r,rippleSize:i,cb:a}=e,o=v.current;v.current+=1,p(e=>{let a=[...e.items,{key:o,pulsate:t,rippleX:n,rippleY:r,rippleSize:i,exiting:!1}];return{items:a,order:z(e.order,a.filter(e=>!e.exiting).map(e=>e.key))}}),y.current=a}),k=l((e=L,t=L,n=ee)=>{let{pulsate:r=!1,center:i=a||t.pulsate,fakeElement:o=!1}=t;if(e?.type===`mousedown`&&x.current){x.current=!1;return}e?.type===`touchstart`&&(x.current=!0);let{rippleX:s,rippleY:c,rippleSize:l}=te({event:e,element:o?null:T.current,center:i});e?.touches?w.current===null&&(w.current=()=>{O({pulsate:r,rippleX:s,rippleY:c,rippleSize:l,cb:n})},S.start(80,()=>{w.current&&=(w.current(),null)})):O({pulsate:r,rippleX:s,rippleY:c,rippleSize:l,cb:n})}),A=l(()=>{k(L,{pulsate:!0})}),j=l((e,t)=>{S.clear(),e?.type===`touchend`&&w.current?(w.current(),w.current=null,S.start(0,()=>{j(e,t)})):(w.current=null,p(e=>{let t=e.items.findIndex(e=>!e.exiting);if(t===-1)return e;let n=e.items.slice();return n[t]={...n[t],exiting:!0},{items:n,order:z(e.order,n.filter(e=>!e.exiting).map(e=>e.key))}}),y.current=t)});E.useImperativeHandle(t,()=>({pulsate:A,start:k,stop:j}),[A,k,j]);let M=new Map(h.map(e=>[e.key,e])),P=u.order.map(e=>M.get(e)).filter(Boolean);return(0,N.jsx)(H,{className:m(F.root,o.root,s),ref:T,...c,children:P.map(e=>(0,N.jsx)(U,{classes:{ripple:m(o.ripple,F.ripple),rippleVisible:m(o.rippleVisible,F.rippleVisible),ripplePulsate:m(o.ripplePulsate,F.ripplePulsate),child:m(o.child,F.child),childLeaving:m(o.childLeaving,F.childLeaving),childPulsate:m(o.childPulsate,F.childPulsate)},timeout:i.shouldReduceMotion?0:I,pulsate:e.pulsate,rippleX:e.rippleX,rippleY:e.rippleY,rippleSize:e.rippleSize,in:!e.exiting,onExited:()=>D(e.key)},e.key))})});function ae(e){return w(`MuiButtonBase`,e)}var W=S(`MuiButtonBase`,[`root`,`disabled`,`focusVisible`]),oe=e=>{let{disabled:t,focusVisible:n,focusVisibleClassName:r,suppressFocusVisible:i,classes:a}=e,o=h({root:[`root`,t&&`disabled`,n&&!i&&`focusVisible`]},ae,a);return n&&!i&&r&&(o.root+=` ${r}`),o},se=s(`button`,{name:`MuiButtonBase`,slot:`Root`})(i(({theme:e})=>({display:`inline-flex`,alignItems:`center`,justifyContent:`center`,position:`relative`,boxSizing:`border-box`,WebkitTapHighlightColor:`transparent`,backgroundColor:`transparent`,outline:0,border:0,margin:0,borderRadius:0,padding:0,cursor:`pointer`,userSelect:`none`,verticalAlign:`middle`,MozAppearance:`none`,WebkitAppearance:`none`,textDecoration:`none`,color:`inherit`,"&::-moz-focus-inner":{borderStyle:`none`},[`&.${W.disabled}`]:{pointerEvents:`none`,cursor:`default`},"@media print":{colorAdjust:`exact`},variants:[{props:{internalDisabledThemeFocusVisible:!1},style:e.focusVisible&&{...x,[`&.${W.focusVisible}`]:e.focusVisible}}]}))),G=E.forwardRef(function(e,t){let n=d({props:e,name:`MuiButtonBase`}),{action:r,centerRipple:i=!1,children:o,className:s,component:c=`button`,disabled:u=!1,disableRipple:f=!1,disableTouchRipple:h=!1,focusRipple:g=!1,focusVisibleClassName:_,focusableWhenDisabled:v,suppressFocusVisible:y=!1,internalNativeButton:b,internalDisabledThemeFocusVisible:x=!1,LinkComponent:S=`a`,nativeButton:C,onBlur:w,onClick:T,onContextMenu:D,onDragLeave:O,onFocus:A,onFocusVisible:M,onKeyDown:P,onKeyUp:F,onMouseDown:I,onMouseLeave:L,onMouseUp:R,onTouchEnd:ee,onTouchMove:z,onTouchStart:te,tabIndex:B=0,TouchRippleProps:ne,touchRippleRef:re,type:V,...H}=n,U=!!(H.href||H.to),ae=!!H.formAction,W=c;W===`button`&&U&&(W=S);let G=typeof W==`string`?W===`button`:b??!1,ce=C??G,q=j(),J=a(q.ref,re),[Y,X]=E.useState(!1);(u||y)&&Y&&X(!1);let le=l(e=>{g&&!e.repeat&&Y&&e.key===` `&&q.stop(e,()=>{q.start(e)})}),ue=l(e=>{g&&e.key===` `&&Y&&!e.defaultPrevented&&q.stop(e,()=>{q.pulsate(e)})}),{getButtonProps:de,rootRef:Z}=k({nativeButton:ce,nativeButtonProp:C,internalNativeButton:G,allowInferredHostMismatch:U||typeof W==`string`,disabled:u,type:V,hasFormAction:ae,tabIndex:B,onBeforeKeyDown:le,onBeforeKeyUp:ue}),{onClick:fe,onKeyDown:pe,onKeyUp:Q,...me}=de({onClick:T,onKeyDown:P,onKeyUp:F});E.useImperativeHandle(r,()=>({focusVisible:()=>{X(!0),Z.current.focus()}}),[Z]);let he=q.shouldMount&&!f&&!u;E.useEffect(()=>{Y&&g&&!f&&q.pulsate()},[f,g,Y,q]);let ge=K(q,`start`,I,h),_e=K(q,`stop`,D,h),ve=K(q,`stop`,O,h),ye=K(q,`stop`,R,h),be=K(q,`stop`,e=>{Y&&e.preventDefault(),L&&L(e)},h),xe=K(q,`start`,te,h),Se=K(q,`stop`,ee,h),Ce=K(q,`stop`,z,h),we=K(q,`stop`,e=>{p(e.target)||X(!1),w&&w(e)},!1),Te=l(e=>{Z.current||=e.currentTarget,!y&&p(e.target)&&(X(!0),M&&M(e)),A&&A(e)}),$={};U&&($.tabIndex=u?-1:B,u&&($[`aria-disabled`]=u),$.type=V);let Ee=a(t,Z),De={...n,centerRipple:i,component:c,disabled:u,disableRipple:f,disableTouchRipple:h,focusRipple:g,suppressFocusVisible:y,tabIndex:B,focusVisible:Y,internalDisabledThemeFocusVisible:x},Oe=oe(De);return(0,N.jsxs)(se,{as:W,className:m(Oe.root,s),ownerState:De,onBlur:we,onClick:fe,onContextMenu:_e,onFocus:Te,onKeyDown:pe,onKeyUp:Q,onMouseDown:ge,onMouseLeave:be,onMouseUp:ye,onDragLeave:ve,onTouchEnd:Se,onTouchMove:Ce,onTouchStart:xe,ref:Ee,...U?$:me,...H,children:[o,he?(0,N.jsx)(ie,{ref:J,center:i,...ne}):null]})});function K(e,t,n,r=!1){return l(i=>(n&&n(i),r||e[t](i),!0))}function ce(e){return w(`MuiCircularProgress`,e)}S(`MuiCircularProgress`,[`root`,`determinate`,`indeterminate`,`colorPrimary`,`colorSecondary`,`svg`,`track`,`circle`,`circleDisableShrink`]);var q=44,J=t`
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
`,Y=t`
  0% {
    stroke-dasharray: 1px, 200px;
    stroke-dashoffset: 0;
  }

  50% {
    stroke-dasharray: 100px, 200px;
    stroke-dashoffset: -15px;
  }

  100% {
    stroke-dasharray: 1px, 200px;
    stroke-dashoffset: -126px;
  }
`,X=typeof J==`string`?null:y`
        animation: ${J} 1.4s linear infinite;
      `,le=typeof Y==`string`?null:y`
        animation: ${Y} 1.4s ease-in-out infinite;
      `,ue=e=>{let{classes:t,variant:n,color:r,disableShrink:i}=e,a={root:[`root`,n,`color${u(r)}`],svg:[`svg`],track:[`track`],circle:[`circle`,i&&`circleDisableShrink`]};return h(a,ce,t)},de=s(`span`,{name:`MuiCircularProgress`,slot:`Root`,overridesResolver:(e,t)=>{let{ownerState:n}=e;return[t.root,t[n.variant],t[`color${u(n.color)}`]]}})(i(({theme:e})=>{let t=c(e,{animation:`none`});return{display:`inline-block`,variants:[{props:{variant:`determinate`},style:{...o(e,`transform`)}},{props:{variant:`indeterminate`},style:X||{animation:`${J} 1.4s linear infinite`}},...t?[{props:{variant:`indeterminate`},style:t}]:[],...Object.entries(e.palette).filter(b()).map(([t])=>({props:{color:t},style:{color:(e.vars||e).palette[t].main}}))]}})),Z=s(`svg`,{name:`MuiCircularProgress`,slot:`Svg`})({display:`block`}),fe=s(`circle`,{name:`MuiCircularProgress`,slot:`Circle`,overridesResolver:(e,t)=>{let{ownerState:n}=e;return[t.circle,n.disableShrink&&t.circleDisableShrink]}})(i(({theme:e})=>{let t=c(e,{animation:`none`});return{stroke:`currentColor`,variants:[{props:{variant:`determinate`},style:{...o(e,`stroke-dashoffset`)}},{props:{variant:`indeterminate`},style:{strokeDasharray:`80px, 200px`,strokeDashoffset:0}},{props:({ownerState:e})=>e.variant===`indeterminate`&&!e.disableShrink,style:le||{animation:`${Y} 1.4s ease-in-out infinite`}},...t?[{props:({ownerState:e})=>e.variant===`indeterminate`&&!e.disableShrink,style:t}]:[]]}})),pe=s(`circle`,{name:`MuiCircularProgress`,slot:`Track`})(i(({theme:e})=>({stroke:`currentColor`,opacity:(e.vars||e).palette.action.activatedOpacity}))),Q=E.forwardRef(function(e,t){let n=d({props:e,name:`MuiCircularProgress`}),{className:r,color:i=`primary`,disableShrink:a=!1,enableTrackSlot:o=!1,min:s,max:c,size:l=40,style:u,thickness:f=3.6,value:p=n.min??0,variant:h=`indeterminate`,...g}=n,_=s??0,v=c??100,y={...n,color:i,disableShrink:a,size:l,thickness:f,value:p,variant:h,enableTrackSlot:o},b=ue(y),x={},S={},C={};if(h===`determinate`){let e=2*Math.PI*((q-f)/2),t=v-_;x.strokeDasharray=e.toFixed(3),x.strokeDashoffset=t>0?`${((v-p)/t*e).toFixed(3)}px`:`${e.toFixed(3)}px`,S.transform=`rotate(-90deg)`,C[`aria-valuenow`]=p,C[`aria-valuemin`]=_,C[`aria-valuemax`]=v}return(0,N.jsx)(de,{className:m(b.root,r),style:{width:l,height:l,...S,...u},ownerState:y,ref:t,role:`progressbar`,...C,...g,children:(0,N.jsxs)(Z,{className:b.svg,ownerState:y,viewBox:`${q/2} ${q/2} ${q} ${q}`,children:[o?(0,N.jsx)(pe,{className:b.track,ownerState:y,cx:q,cy:q,r:(q-f)/2,fill:`none`,strokeWidth:f,"aria-hidden":`true`}):null,(0,N.jsx)(fe,{className:b.circle,style:x,ownerState:y,cx:q,cy:q,r:(q-f)/2,fill:`none`,strokeWidth:f})]})})});function me(e){return w(`MuiIconButton`,e)}var he=S(`MuiIconButton`,[`root`,`disabled`,`colorInherit`,`colorPrimary`,`colorSecondary`,`colorError`,`colorInfo`,`colorSuccess`,`colorWarning`,`edgeStart`,`edgeEnd`,`sizeSmall`,`sizeMedium`,`sizeLarge`,`loading`,`loadingIndicator`,`loadingWrapper`]),ge=e=>{let{classes:t,disabled:n,color:r,edge:i,size:a,loading:o}=e,s={root:[`root`,o&&`loading`,n&&`disabled`,r!=="default"&&`color${u(r)}`,i&&`edge${u(i)}`,`size${u(a)}`],loadingIndicator:[`loadingIndicator`],loadingWrapper:[`loadingWrapper`]};return h(s,me,t)},_e=s(G,{name:`MuiIconButton`,slot:`Root`,overridesResolver:(e,t)=>{let{ownerState:n}=e;return[t.root,n.loading&&t.loading,n.color!=="default"&&t[`color${u(n.color)}`],n.edge&&t[`edge${u(n.edge)}`],t[`size${u(n.size)}`]]}})(i(({theme:e})=>({textAlign:`center`,flex:`0 0 auto`,fontSize:e.typography.pxToRem(24),padding:8,borderRadius:`50%`,color:(e.vars||e).palette.action.active,...o(e,`background-color`,{duration:e.transitions.duration.shortest}),variants:[{props:e=>!e.disableRipple,style:{"--IconButton-hoverBg":e.alpha((e.vars||e).palette.action.active,(e.vars||e).palette.action.hoverOpacity),"&:hover":{backgroundColor:`var(--IconButton-hoverBg)`,"@media (hover: none)":{backgroundColor:`transparent`}}}},{props:{edge:`start`},style:{marginLeft:-12}},{props:{edge:`start`,size:`small`},style:{marginLeft:-3}},{props:{edge:`end`},style:{marginRight:-12}},{props:{edge:`end`,size:`small`},style:{marginRight:-3}}]})),i(({theme:e})=>({variants:[{props:{color:`inherit`},style:{color:`inherit`}},...Object.entries(e.palette).filter(b()).map(([t])=>({props:{color:t},style:{color:(e.vars||e).palette[t].main,"--IconButton-hoverBg":e.alpha((e.vars||e).palette[t].main,(e.vars||e).palette.action.hoverOpacity)}})),{props:{size:`small`},style:{padding:5,fontSize:e.typography.pxToRem(18)}},{props:{size:`large`},style:{padding:12,fontSize:e.typography.pxToRem(28)}}],[`&.${he.disabled}`]:{backgroundColor:`transparent`,color:(e.vars||e).palette.action.disabled},[`&.${he.loading}`]:{color:`transparent`}}))),ve=s(`span`,{name:`MuiIconButton`,slot:`LoadingIndicator`})(({theme:e})=>({display:`none`,position:`absolute`,visibility:`visible`,top:`50%`,left:`50%`,transform:`translate(-50%, -50%)`,color:(e.vars||e).palette.action.disabled,variants:[{props:{loading:!0},style:{display:`flex`}}]})),ye=E.forwardRef(function(e,t){let n=d({props:e,name:`MuiIconButton`}),{edge:r=!1,children:i,className:a,color:o=`default`,disabled:s=!1,disableFocusRipple:c=!1,size:l=`medium`,id:u,loading:f=null,loadingIndicator:p,...h}=n,g=v(u),_=p??(0,N.jsx)(Q,{"aria-labelledby":g,color:`inherit`,size:16}),y={...n,edge:r,color:o,disabled:s,disableFocusRipple:c,loading:f,loadingIndicator:_,size:l},b=ge(y);return(0,N.jsxs)(_e,{id:f?g:u,className:m(b.root,a),centerRipple:!0,internalNativeButton:!0,focusRipple:!c,disabled:s||f,ref:t,...h,ownerState:y,children:[typeof f==`boolean`&&(0,N.jsx)(`span`,{className:b.loadingWrapper,style:{display:`contents`},children:(0,N.jsx)(ve,{className:b.loadingIndicator,ownerState:y,children:f&&_})}),i]})});export{W as i,Q as n,G as r,ye as t};