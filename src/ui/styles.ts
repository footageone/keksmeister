// Vite's ?inline import minifies the CSS at build time and inlines it as a string.
// This replaces the previous template literal which preserved all whitespace.
import bannerStyles from './styles.css?inline';
export { bannerStyles };
