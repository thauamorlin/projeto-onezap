import LogoImg from "../../img/logo.png";

export function Loading() {
  return (
    <div className="flex h-40 w-full items-center justify-center">
      <img className="loading w-40" src={LogoImg} />
    </div>
  );
}
