import {
  Link,
} from "react-router-dom";


export default function AdminPage() {
  return (
    <main
      style={{
        minHeight:
          "100vh",

        padding:
          "32px",
      }}
    >
      <p>
        ADMINISTRACIÓN DE VUELVO
      </p>

      <h1>
        Panel de plataforma
      </h1>

      <p>
        Administra los negocios registrados en Vuelvo.
      </p>

      <Link
        to="/admin/negocios"
      >
        VER NEGOCIOS
      </Link>
    </main>
  );
}
