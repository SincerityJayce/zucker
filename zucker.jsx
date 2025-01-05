import { omit } from "lodash-es";
import { debounce } from 'lodash-es';
import {create} from "zustand"
import { immer } from "zustand/middleware/immer";

const lodash = {omit, debounce}

export function sweeten(store) { //@todo tidy
 const get = store.getState;
 const set = store.setState;

 // store sets if given args, and returns self for more chaining (set(...args);return self)
 // if not given args, returns the stored state (get())
 function sweetenedStore(...args) {
  if(args.length==0) return get();

  if(args[0] instanceof Object){
   Object.keys(args[0]).forEach(k=>{ //sus this block for performance later. may be overkill
    makeGetter(k)// add missing handles
    makeHooks(k)
   })
  }
  set(...args);
  return sweetenedStore
 }
 sweetenedStore.use = (...args)=>{
  if(typeof args[0] !== 'function') {
   return store(s=>s[args[0]])
  }
  return store(...args)} // main hook


 //components
 Object.entries(get()).forEach(([key,val]) => {
  if (typeof val === 'function' && firstLetterIsUpperCase(key)) {
   function Component(...props){return val(...props)}
   set({[key]:(props)=><Component {...props}/>})
  }
 })
 
 const makeGetter = (KEY, sel=((s)=>s[KEY]))=>{
  let kEY = firstLower(KEY)
  nameSpaceIsAssignable(sweetenedStore,kEY)&&Object.defineProperty(sweetenedStore, kEY, {   get: () => sel(get())})
 }
 const makeHooks = (key, sel=((s)=>s[key]))=>{ 
  let Key = firstUpper(key)
  nameSpaceIsAssignable(sweetenedStore,Key)&&Object.defineProperty(sweetenedStore, Key, {  get: () => {return store(sel)}  }); //store.Hook syntax
  nameSpaceIsAssignable(sweetenedStore.use,key)&&Object.defineProperty(sweetenedStore.use,         key, {  get: () => {return store(sel)}  }); //store.use.hook syntax
 }



 //methods
 sweetenedStore.methods = methods=>Object.assign(sweetenedStore,
  Object.entries(methods).reduce((acc, [methodName, method]) => Object.assign(acc,{[methodName]: (...payload) => {let setter =method(...payload);
   if(setter){
    // if(Array.isArray(setter)){return set(...setter)}
   set(setter)
   }}}), {})
 );
 
 //selectors
 sweetenedStore.selectors = selectors=>{Object.entries(selectors).forEach(([key, selector]) => {  
  Object.assign(sweetenedStore, {
   [firstLower(key)]: (...args) => selector(...args)(get()),
   [firstUpper(key)]: (...args) => store(selector(...args))
  })

  });
  return sweetenedStore
 }

 //setters
 sweetenedStore.setters = setters=>Object.assign(sweetenedStore,
  Object.entries(setters).reduce((acc, [setterName, setter]) => Object.assign(acc,{[setterName]: (payload) => set(setter)}), {})
 );

 //getters
 sweetenedStore.getters = getters=>{
 Object.entries(getters).forEach(([key, getter]) => {
   makeGetter(key, getter)
   makeHooks(key, getter)
  });
  return sweetenedStore
 }

 //subscribe
 let mw = withSelector_middlewareDetected(store)
 sweetenedStore.subscribe = (...args)=>{ //@todo tidy
  if(!mw){
   // .now() method gives simple subscriptions 'fire immediately' 
   // functionality that is not present in the original zustand
   let subsciptionCleanupFunc = store.subscribe(...args); 
   subsciptionCleanupFunc.now = ()=>{args[0](get());return subsciptionCleanupFunc}; 
   return subsciptionCleanupFunc
  }
  if(args.length==1){
   let subsciptionCleanupFunc = store.subscribe(s=>s,args[0]); 
   subsciptionCleanupFunc.now = ()=>{args[0](get());return subsciptionCleanupFunc}
   return subsciptionCleanupFunc
  }
  if(args.length>1){
   let subsciptionCleanupFunc = store.subscribe(...args); 
   subsciptionCleanupFunc.now = ()=>{args[1](args[0](get()));return subsciptionCleanupFunc}
   return subsciptionCleanupFunc
  }
 }
 if(mw){sweetenedStore.subscribe.withSelector = store.subscribe} // redundant but will give peace of mind

 //listen
 const activateListener = ([listenerName,listener])=>listener(payload=>set({[listenerName]:payload}), sweetenedStore)
 const processListener = ([listenerName, listener]) => {
  let result = activateListener([listenerName, listener])
 //getter
  makeGetter(listenerName)
  //hook
  makeHooks(listenerName)
  return [listenerName, result]
 }
 Object.entries(get()).filter(isAListener).map(l=>[l[0],l[1].cb]).forEach(activateListener)

 sweetenedStore.extra = extra=>Object.assign(sweetenedStore, extra)

 sweetenedStore.listeners = listeners=>{
  Object.entries(listeners).map(processListener)
  .forEach(([listenerName, result])=>{
   if(result)handle[listenerName]=result
  })
  return sweetenedStore}
  sweetenedStore.listenFor = sweetenedStore.listeners


 sweetenedStore.extra(popValues('extra','handles','also','tools', 'api'))
 sweetenedStore.api=sweetenedStore.extra //clean this
 sweetenedStore.methods(popValues('methods','method'))
 sweetenedStore.selectors(popValues('selectors','select'))
 sweetenedStore.setters(popValues('setters','set'))
 sweetenedStore.getters(popValues('getters','get'))
 const initableListeners = popValues('listeners','listen')

 sweetenedStore.Compute= function ({debounce=0}={},selector){ //uppercase Compute for hook
  const [debounced, set] = useState();
  useEffect(()=>this.subscribe(lodash.debounce(s=>{set(selector(s))}, debounce)) ,[])
  return debounced
 }

 // const computations = 
 // sweetenedStore.computed= function (values, dependencies){

 // }
 //lowercase computed for store building // should be at the top, modifying set function

 //getters
 Object.keys(get()).forEach(k=>makeGetter(k));
 //hooks
 Object.keys(get()).forEach(k=>makeHooks(k))

 sweetenedStore.handle={}
 sweetenedStore.listeners(initableListeners) //listnerers last because their methods are called in the processListener function


 function popValues(...names){
  let acc = {}
  names.forEach(n=>Object.assign(acc,get()[n]))
  
  set(s=>omit(s, names,true))
  return acc
 }
 return sweetenedStore
}

export function zuc (s={}){ return sweeten(create(immer((typeof s === 'object')?()=>s:s)))}

[sweeten, zuc].forEach(z=>Object.assign(z, {listen:cb=>({imAZuckerListener,cb})})) //? maybe keep this, maybe throw it away
export const sweet = zuc

const imAZuckerListener = "yesThisIsAListener. Zucker Created This Object" //depriicated
function isAListener([key,obj]){return obj?.imAZuckerListener==imAZuckerListener}

function firstLower(str) {
 return str[0].toLowerCase() + str.slice(1)
}
function firstUpper(str) {
 return str[0].toUpperCase() + str.slice(1)
}
function firstLetterIsUpperCase(str) {
 return str[0].toUpperCase() === str[0];
}

const forbidenKeys = [
 'listeners','listen', // done
 'selectors','select',//
 'setters','set',//
 'getters','get',//
 'methods','method',//
 'extra','handles','also','tools', 'api',//
 'subscribe',//
 'Compute','compute',
]
const nameSpaceIsAssignable = (obj, key)=>!(
 Object.hasOwnProperty(obj, key)
 ||getters(obj).includes(key)
 ||forbidenKeys.includes(key)
)
const getters = obj=> Object.getOwnPropertyNames(obj)
  .map(key => [key, Object.getOwnPropertyDescriptor(obj, key)])
  .filter(([key, descriptor]) => typeof descriptor.get === 'function')
  .map(([key]) => key)


function withSelector_middlewareDetected(store){
 return store.subscribe.toString().includes("(selector, optListener, options) => {")
}

