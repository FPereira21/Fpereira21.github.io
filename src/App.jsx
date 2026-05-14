import React, { useState, useEffect, useCallback, useRef } from "react";

// === DATOS DE PRUEBA (Simulan los JSON estáticos del repo) ===
// En la versión final de GitHub Pages, podrías cargarlos con fetch('./productos.json')

// Iconos SVG simples (evitamos dependencias extras pesadas)
const IconCart = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="8" cy="21" r="1" />
    <circle cx="19" cy="21" r="1" />
    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
  </svg>
);
const IconImage = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </svg>
);
const IconTrash = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <line x1="10" x2="10" y1="11" y2="17" />
    <line x1="14" x2="14" y1="11" y2="17" />
  </svg>
);

export default function App() {
  const [obras, setObras] = useState([]);
  const [productos, setProductos] = useState([]);
  const [obraSeleccionada, setObraSeleccionada] = useState("");
  const [carrito, setCarrito] = useState({}); // Formato: { "P1": 2, "P2": 5 }
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const remitoRef = useRef(null);

  // Funciones auxiliares para la URL (pensado a futuro para localStorage también)
  const getUrlParams = useCallback(() => {
    return new URLSearchParams(window.location.search);
  }, []);

  const updateUrl = useCallback((obraId, currentCart) => {
    const params = new URLSearchParams();
    if (obraId) params.set("obra", obraId);

    // Convertimos { "P1": 2, "P3": 5 } a "P1:2,P3:5"
    const cartEntries = Object.entries(currentCart)
      .filter(([_, cant]) => cant > 0)
      .map(([id, cant]) => `${id}:${cant}`);

    if (cartEntries.length > 0) {
      params.set("cart", cartEntries.join(","));
    }

    const newUrl = `${window.location.pathname}${params.toString() ? "?" + params.toString() : ""}`;
    window.history.replaceState({}, "", newUrl);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [obrasRes, productosRes] = await Promise.all([
          fetch("./obras.json"),
          fetch("./productos.json"),
        ]);
        const obrasData = await obrasRes.json();
        const productosData = await productosRes.json();

        setObras(obrasData);
        setProductos(productosData);

        // Leer URL inicial
        const params = getUrlParams();
        const urlObra = params.get("obra");
        const urlCart = params.get("cart");

        if (urlObra) setObraSeleccionada(urlObra);

        if (urlCart) {
          // Parsear "P1:2,P3:5"
          const newCart = {};
          urlCart.split(",").forEach((item) => {
            const [id, qty] = item.split(":");
            if (id && qty && !isNaN(parseInt(qty))) {
              newCart[id] = parseInt(qty);
            }
          });
          setCarrito(newCart);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [getUrlParams]);

  const handleCambioObra = (e) => {
    const nuevaObra = e.target.value;
    setObraSeleccionada(nuevaObra);
    updateUrl(nuevaObra, carrito);
  };

  const modificarCantidad = (productoId, delta) => {
    setCarrito((prev) => {
      const cantidadActual = prev[productoId] || 0;
      const nuevaCantidad = Math.max(0, cantidadActual + delta);

      const nuevoCarrito = { ...prev };
      if (nuevaCantidad === 0) {
        delete nuevoCarrito[productoId];
      } else {
        nuevoCarrito[productoId] = nuevaCantidad;
      }

      updateUrl(obraSeleccionada, nuevoCarrito);
      return nuevoCarrito;
    });
  };

  const vaciarCarrito = () => {
    if (window.confirm("¿Seguro que quieres vaciar el pedido completo?")) {
      setCarrito({});
      updateUrl(obraSeleccionada, {});
    }
  };

  // Agregamos la librería dinámicamente solo cuando se necesita
  const exportarImagen = async () => {
    if (!obraSeleccionada) {
      alert("Por favor, selecciona una obra primero.");
      return;
    }
    if (Object.keys(carrito).length === 0) {
      alert("El pedido está vacío.");
      return;
    }

    setIsExporting(true);
    try {
      // Cargar html2canvas dinámicamente si no existe
      if (!window.html2canvas) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src =
            "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const element = remitoRef.current;
      const canvas = await window.html2canvas(element, {
        scale: 2, // Mejor calidad
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const dataURL = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const nombreObraFile =
        obras
          .find((o) => o.id === obraSeleccionada)
          ?.nombre.replace(/\s+/g, "_") || "obra";
      link.download = `Pedido_${nombreObraFile}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataURL;
      link.click();
    } catch (error) {
      console.error("Error al exportar:", error);
      alert("Hubo un error al generar la imagen.");
    } finally {
      setIsExporting(false);
    }
  };

  const formatoMoneda = (monto) =>
    new Intl.NumberFormat("es-UY", {
      style: "currency",
      currency: "UYU",
    }).format(monto);

  const calcularTotal = () => {
    return Object.entries(carrito).reduce((total, [id, cantidad]) => {
      const prod = productos.find((p) => p.id === id);
      return total + (prod ? prod.precio * cantidad : 0);
    }, 0);
  };

  const obraActualData = obras.find((o) => o.id === obraSeleccionada);
  const hayItemsEnCarrito = Object.keys(carrito).length > 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl font-bold text-gray-600 animate-pulse">
          Cargando sistema...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      {/* Header */}
      <header className="bg-slate-800 text-white p-4 shadow-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <IconCart className="text-orange-400" />
            <h1 className="text-xl font-bold">
              Catanga{" "}
              <span className="text-slate-400 text-sm font-normal hidden sm:inline">
                | Pedidos de Materiales
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-700 rounded p-1 px-3">
              <span className="text-sm">Total: </span>
              <span className="font-bold text-orange-400">
                {formatoMoneda(calcularTotal())}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lado Izquierdo: Catálogo y Selector */}
        <div className="lg:col-span-2 space-y-6">
          {/* Selector de Obra */}
          <section className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-3 border-b pb-2">
              1. Seleccionar Obra de Destino
            </h2>
            <select
              value={obraSeleccionada}
              onChange={handleCambioObra}
              className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-gray-50 text-gray-900"
            >
              <option value="">-- Seleccione una obra --</option>
              {obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre} ({o.direccion})
                </option>
              ))}
            </select>
            {!obraSeleccionada && hayItemsEnCarrito && (
              <p className="text-sm text-amber-600 mt-2">
                ⚠️ Selecciona una obra para poder generar el remito.
              </p>
            )}
          </section>

          {/* Catálogo de Productos */}
          <section className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">
              2. Catálogo de Materiales
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {productos.map((prod) => {
                const cantidadEnCarrito = carrito[prod.id] || 0;
                return (
                  <div
                    key={prod.id}
                    className={`flex flex-col p-4 border rounded-lg transition-colors ${cantidadEnCarrito > 0 ? "border-orange-300 bg-orange-50" : "border-gray-200 hover:border-slate-300"}`}
                  >
                    <div className="flex-grow">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {prod.categoria}
                      </span>
                      <h3 className="font-bold text-md leading-tight mt-1">
                        {prod.nombre}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {prod.unidad}
                      </p>
                      <p className="text-lg font-bold text-slate-700 mt-2">
                        {formatoMoneda(prod.precio)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-4 bg-white rounded border border-gray-200 overflow-hidden">
                      <button
                        onClick={() => modificarCantidad(prod.id, -1)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-colors disabled:opacity-50"
                        disabled={cantidadEnCarrito === 0}
                      >
                        -
                      </button>
                      <span className="font-bold w-12 text-center">
                        {cantidadEnCarrito}
                      </span>
                      <button
                        onClick={() => modificarCantidad(prod.id, 1)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Lado Derecho: Resumen / Remito Visual */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            {/* Controles de Exportación */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col gap-3">
              <button
                onClick={exportarImagen}
                disabled={
                  !obraSeleccionada || !hayItemsEnCarrito || isExporting
                }
                className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <IconImage />
                {isExporting ? "Generando..." : "Descargar como Imagen"}
              </button>

              <button
                onClick={vaciarCarrito}
                disabled={!hayItemsEnCarrito}
                className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-red-50 text-red-600 rounded-lg font-semibold hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <IconTrash className="w-4 h-4" /> Vaciar Pedido
              </button>
            </div>

            {/* AREA EXPORTABLE (Lo que captura html2canvas) */}
            <div
              ref={remitoRef}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
              style={{ minHeight: "400px" }} // Asegurar buen tamaño para la captura
            >
              {/* Encabezado del Remito */}
              <div className="border-b-2 border-slate-800 pb-4 mb-4">
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
                  Orden de Pedido
                </h2>
                <div className="mt-4 text-sm">
                  <p>
                    <span className="font-bold">Fecha:</span>{" "}
                    {new Date().toLocaleDateString("es-UY")}
                  </p>
                  <p>
                    <span className="font-bold">Obra:</span>{" "}
                    {obraActualData ? (
                      obraActualData.nombre
                    ) : (
                      <span className="text-red-500 italic">
                        No seleccionada
                      </span>
                    )}
                  </p>
                  <p>
                    <span className="font-bold">Dirección:</span>{" "}
                    {obraActualData ? obraActualData.direccion : "-"}
                  </p>
                </div>
              </div>

              {/* Lista de Items */}
              {!hayItemsEnCarrito ? (
                <div className="text-center text-gray-400 py-10 italic">
                  Agrega materiales del catálogo para generar la orden.
                </div>
              ) : (
                <div className="space-y-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="pb-2 font-normal">Cant.</th>
                        <th className="pb-2 font-normal">Descripción</th>
                        <th className="pb-2 font-normal text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(carrito).map(([id, cantidad]) => {
                        if (cantidad === 0) return null;
                        const prod = productos.find((p) => p.id === id);
                        if (!prod) return null;
                        return (
                          <tr key={id} className="border-b border-gray-100">
                            <td className="py-2 font-bold align-top">
                              {cantidad}
                            </td>
                            <td className="py-2">
                              <div className="font-medium text-slate-800">
                                {prod.nombre}
                              </div>
                              <div className="text-xs text-gray-500">
                                {prod.unidad}
                              </div>
                            </td>
                            <td className="py-2 text-right align-top font-medium">
                              {formatoMoneda(prod.precio * cantidad)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Total del Remito */}
                  <div className="flex justify-between items-center pt-4 mt-4 border-t-2 border-slate-800">
                    <span className="font-bold text-lg">TOTAL ESTIMADO</span>
                    <span className="font-black text-xl text-slate-800">
                      {formatoMoneda(calcularTotal())}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 text-center mt-6 uppercase tracking-widest">
                    Generado con App Catanga
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
