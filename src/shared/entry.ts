/** Local view destinations only; never accept arbitrary post-login redirects. */
export function loginDestination(requested: string | null): string {
  if(requested==='/lite'||requested==='/lite.html')return '/lite';
  if(requested==='/office'||requested==='/office.html')return '/office.html';
  return '/';
}
