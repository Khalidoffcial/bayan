import '@testing-library/jest-dom';

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

