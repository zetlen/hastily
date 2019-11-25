# hastily

express middleware to simulate fastly cdn

## TODO

- [x] implement resize and crop mappers
- [x] throw on unsupported
- [x] implement enable and disable for upscaling in resize
- [x] implement format, auto=webp, and quality params in post-manip phase
- [ ] add unit tests
- [ ] add image-diff automated testing
- [ ] implement sharpen, mapping [amt, radius, threshold] to libvips sharpen params
- [ ] implement brightness, contrast, saturation by figuring out percentage to multiplier mapping
- [ ] use image.metadata() to implement relative and context-based methods
- [ ] add header-based methods
  - [ ] montage
  - [ ] overlay
