import { useEffect } from "react";
import { useRouter } from "next/router";
import InstallApp from "../components/InstallApp";

export default function App({ Component, pageProps }) {
  const { pathname } = useRouter();
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return (
    <>
      <Component {...pageProps} />
      {/* Offer the app on the dashboard/login only, not on the public apply page */}
      {pathname === "/" && <InstallApp />}
    </>
  );
}
