// Ambient type declarations for CSS/CSS-module imports used on the web
// target (Metro's web bundler handles these at build time; TypeScript needs
// a declaration to know what shape they resolve to).

declare module '*.module.css' {
  const classes: { readonly [className: string]: string };
  export default classes;
}

declare module '*.css';
