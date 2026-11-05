import type {CollegeId} from './domain';
// These compile-time values are injected only by the GitHub Pages build.
declare const __NAF_BASE_PATH__: string | undefined;
declare const __NAF_API_ORIGIN__: string | undefined;
const basePath=typeof __NAF_BASE_PATH__==='string'?__NAF_BASE_PATH__:'';
const apiOrigin=typeof __NAF_API_ORIGIN__==='string'?__NAF_API_ORIGIN__:'';
const instructionContexts=new Map<CollegeId,string>();
export const sitePath=(path:string)=>`${basePath}${path}`;
export const adminUrl=()=>`${apiOrigin}/admin`;
export function rememberInstructions(id:CollegeId,token?:string){if(apiOrigin&&token)instructionContexts.set(id,token);}
export function portalFetch(path:string,init:RequestInit={}){
 const headers=new Headers(init.headers);
 const college=path.match(/^\/api\/college\/(srm|vit|aac)\/register$/)?.[1] as CollegeId|undefined;
 if(apiOrigin&&college){const token=instructionContexts.get(college);if(token)headers.set('X-Registration-Context',token);}
 return fetch(`${apiOrigin}${path}`,{...init,headers,credentials:apiOrigin?'omit':'same-origin'});
}
