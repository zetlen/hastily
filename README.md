# hastily

express middleware to simulate fastly cdn

## TODO

- [x] implement resize and crop mappers
- [x] throw on unsupported
- [ ] implement sharpen, mapping [amt, radius, threshold] to libvips sharpen params
- [ ] implement brightness, contrast, saturation by figuring out percentage to multiplier mapping
- [ ] implement enable and disable for upscaling in resize
- [ ] implement format, auto=webp, and quality params in post-manip phase
- [ ] use image.metadata() to implement relative and context-based methods
- [ ] add unit tests
- [ ] add image-diff automated testing
- [ ] add header-based methods
  - [ ] montage
  - [ ] overlay
