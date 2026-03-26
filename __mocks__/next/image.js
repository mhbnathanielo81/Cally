// Mock next/image to a simple <img> element
const Image = ({ src, alt, width, height, style, ...rest }) => {
  return <img src={src} alt={alt} width={width} height={height} style={style} {...rest} />;
};
module.exports = Image;
module.exports.default = Image;
