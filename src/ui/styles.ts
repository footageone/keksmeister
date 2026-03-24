/**
 * Shadow DOM styles for the Keksmeister banner and modal.
 *
 * All colors, fonts, and sizes are exposed as CSS Custom Properties
 * so the host application can theme the component without breaking
 * Shadow DOM encapsulation.
 *
 * Example theming from the outside:
 *
 *   keksmeister-banner {
 *     --km-primary: #0066cc;
 *     --km-bg: #1a1a1a;
 *     --km-text: #ffffff;
 *     --km-radius: 12px;
 *   }
 */
export const bannerStyles = /* css */ `
  :host {
    /* Layout */
    --km-z-index: 10000;
    --km-position: fixed;
    --km-bottom: 0;
    --km-left: 0;
    --km-right: 0;

    /* Colors */
    --km-bg: #ffffff;
    --km-text: #1a1a1a;
    --km-text-secondary: #555555;
    --km-primary: #1a1a1a;
    --km-primary-text: #ffffff;
    --km-secondary: transparent;
    --km-secondary-text: #1a1a1a;
    --km-border: #e0e0e0;
    --km-overlay: rgba(0, 0, 0, 0.5);

    /* Typography */
    --km-font-family: system-ui, -apple-system, sans-serif;
    --km-font-size: 14px;
    --km-font-size-title: 18px;
    --km-line-height: 1.5;

    /* Spacing */
    --km-padding: 24px;
    --km-gap: 12px;
    --km-radius: 8px;
    --km-radius-button: 6px;

    /* Transitions */
    --km-transition: 0.3s ease;

    display: block;
    position: var(--km-position);
    bottom: var(--km-bottom);
    left: var(--km-left);
    right: var(--km-right);
    z-index: var(--km-z-index);
    font-family: var(--km-font-family);
    font-size: var(--km-font-size);
    line-height: var(--km-line-height);
    color: var(--km-text);
  }

  :host([hidden]) {
    display: none !important;
  }

  /* --- Banner --- */

  .km-banner {
    background: var(--km-bg);
    border-top: 1px solid var(--km-border);
    padding: var(--km-padding);
    box-shadow: 0 -2px 16px rgba(0, 0, 0, 0.08);
    animation: km-slide-up var(--km-transition);
  }

  .km-banner__inner {
    max-width: 960px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: var(--km-gap);
  }

  .km-banner__title {
    font-size: var(--km-font-size-title);
    font-weight: 600;
    margin: 0;
  }

  .km-banner__text {
    color: var(--km-text-secondary);
    margin: 0;
  }

  .km-banner__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--km-gap);
    align-items: center;
  }

  /* --- Buttons --- */

  .km-btn {
    padding: 10px 20px;
    border-radius: var(--km-radius-button);
    font-family: inherit;
    font-size: inherit;
    font-weight: 500;
    cursor: pointer;
    transition: opacity var(--km-transition), background var(--km-transition);
    border: 1px solid var(--km-border);
    line-height: 1;
  }

  .km-btn:hover {
    opacity: 0.85;
  }

  .km-btn:focus-visible {
    outline: 2px solid var(--km-primary);
    outline-offset: 2px;
  }

  .km-btn--primary {
    background: var(--km-primary);
    color: var(--km-primary-text);
    border-color: var(--km-primary);
  }

  .km-btn--secondary {
    background: var(--km-secondary);
    color: var(--km-secondary-text);
    border-color: var(--km-border);
  }

  .km-btn--link {
    background: none;
    border: none;
    color: var(--km-text-secondary);
    text-decoration: underline;
    padding: 10px 8px;
  }

  /* --- Modal (settings) --- */

  .km-overlay {
    position: fixed;
    inset: 0;
    background: var(--km-overlay);
    z-index: var(--km-z-index);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: km-fade-in var(--km-transition);
  }

  .km-modal {
    background: var(--km-bg);
    border-radius: var(--km-radius);
    max-width: 600px;
    width: calc(100% - 32px);
    max-height: 80vh;
    overflow-y: auto;
    padding: var(--km-padding);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.16);
    animation: km-scale-in var(--km-transition);
  }

  .km-modal__title {
    font-size: var(--km-font-size-title);
    font-weight: 600;
    margin: 0 0 8px;
  }

  .km-modal__description {
    color: var(--km-text-secondary);
    margin: 0 0 20px;
  }

  /* --- Category toggles --- */

  .km-category {
    padding: 16px 0;
    border-bottom: 1px solid var(--km-border);
  }

  .km-category:last-child {
    border-bottom: none;
  }

  .km-category__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--km-gap);
  }

  .km-category__label {
    font-weight: 500;
  }

  .km-category__description {
    color: var(--km-text-secondary);
    font-size: 0.9em;
    margin: 4px 0 0;
  }

  .km-category__badge {
    font-size: 0.75em;
    color: var(--km-text-secondary);
    background: var(--km-border);
    padding: 2px 8px;
    border-radius: 99px;
  }

  /* --- Toggle switch --- */

  .km-toggle {
    position: relative;
    width: 44px;
    height: 24px;
    flex-shrink: 0;
  }

  .km-toggle input {
    opacity: 0;
    width: 0;
    height: 0;
    position: absolute;
  }

  .km-toggle__track {
    position: absolute;
    inset: 0;
    background: var(--km-border);
    border-radius: 12px;
    cursor: pointer;
    transition: background var(--km-transition);
  }

  .km-toggle__track::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 50%;
    transition: transform var(--km-transition);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .km-toggle input:checked + .km-toggle__track {
    background: var(--km-primary);
  }

  .km-toggle input:checked + .km-toggle__track::after {
    transform: translateX(20px);
  }

  .km-toggle input:disabled + .km-toggle__track {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .km-toggle input:focus-visible + .km-toggle__track {
    outline: 2px solid var(--km-primary);
    outline-offset: 2px;
  }

  .km-modal__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--km-gap);
    margin-top: 20px;
  }

  .km-privacy-link {
    display: block;
    margin-top: 12px;
    color: var(--km-text-secondary);
    font-size: 0.85em;
  }

  .km-privacy-link a {
    color: inherit;
  }

  /* --- Animations --- */

  @keyframes km-slide-up {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }

  @keyframes km-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes km-scale-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }

  /* --- Responsive --- */

  @media (max-width: 480px) {
    .km-banner__actions {
      flex-direction: column;
    }
    .km-btn {
      width: 100%;
      text-align: center;
    }
    .km-modal__actions {
      flex-direction: column;
    }
  }
`;
