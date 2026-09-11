function Campo({ etiqueta, children }) {
  return (
    <label className="campo">
      <span>{etiqueta}</span>
      {children}
    </label>
  );
}


export default Campo;
