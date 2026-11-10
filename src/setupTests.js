import '@testing-library/jest-dom';

// jsdom has no IntersectionObserver; provide a spec-shaped stub so components
// relying on it (FontPicker lazy previews, FlowViewer active card tracking)
// mount cleanly in tests. Individual tests may override with their own class.
if (typeof window !== 'undefined' && typeof window.IntersectionObserver === 'undefined') {
  window.IntersectionObserver = class {
    constructor(callback) { this.callback = callback; }
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  };
  window.IntersectionObserver.__isTestStub = true;
}

jest.mock('@ckeditor/ckeditor5-react', () => ({
  CKEditor: ({ onChange, data }) => (
    <textarea
      data-testid="ckeditor-mock"
      value={data || ''}
      onChange={(e) => onChange && onChange(null, { getData: () => e.target.value })}
    />
  ),
}));

jest.mock('@ckeditor/ckeditor5-build-classic', () => ({}), { virtual: true });

