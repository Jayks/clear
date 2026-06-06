// Canvas shim — exifr lists canvas as an optional peer dependency.
// We don't need canvas (EXIF GPS extraction doesn't use it).
// This empty module prevents Turbopack from crashing when exifr tries to
// resolve canvas. The webpack() alias in next.config.ts handles the same
// for the webpack bundler path.
export default {};
