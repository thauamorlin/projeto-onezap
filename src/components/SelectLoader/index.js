import ContentLoader from "react-content-loader";

const SelectLoader = (props) => (
  <ContentLoader
    speed={1}
    width="100%"
    height={35}
    backgroundcolor="#f3f3f3"
    foregroundcolor="#ecebeb"
    style={{ margin: "10px 0px" }}
    {...props}
  >
    <rect x="0" y="0" rx="10" ry="10" width="100%" height="35" />
  </ContentLoader>
);

export default SelectLoader;
