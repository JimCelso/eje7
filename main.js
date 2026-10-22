import {
    db,
    storage,
    iniciarSesionAnonima
} from "./firebase.js";

import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    limit,
    serverTimestamp,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

import {
    ref,
    uploadString,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

const camara = document.getElementById("camara");
const lienzo = document.getElementById("lienzo");
const activar = document.getElementById("activar");
const capturar = document.getElementById("capturar");
const estado = document.getElementById("estado");
const ubicacion = document.getElementById("ubicacion");
const galeria = document.getElementById("galeria");
const frase = document.getElementById("frase");
const caracteres = document.getElementById("caracteres");

let flujoCamara = null;
let usuarioActual = null;

activar.addEventListener("click", activarCamara);
capturar.addEventListener("click", tomarFotografia);

frase.addEventListener("input", () => {
    caracteres.textContent = frase.value.length;
});

iniciarAplicacion();

// Conectar Firebase y cargar la galería.
async function iniciarAplicacion() {
    try {
        const credencial = await iniciarSesionAnonima();
        usuarioActual = credencial.user;

        estado.textContent = "Conectado al archivo colectivo.";

        await cargarGaleria();
    } catch (error) {
        console.error("Error al conectar con Firebase:", error);

        estado.textContent = error.code === "auth/api-key-not-valid"
            ? "La API key de Firebase no es válida. Revisa la configuración de la app web en Firebase Console."
            : "No se pudo conectar. Revisa la configuración y las reglas de Firebase.";
    }
}

// Activar la cámara.
async function activarCamara() {
    if (!navigator.mediaDevices?.getUserMedia) {
        estado.textContent =
            "La cámara necesita HTTPS o localhost para funcionar.";
        return;
    }

    try {
        if (flujoCamara) {
            flujoCamara.getTracks().forEach(track => track.stop());
        }

        flujoCamara = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false
        });

        camara.srcObject = flujoCamara;
        await camara.play();

        estado.textContent =
            "Cámara activa. Ya puedes tomar una fotografía.";

        activar.textContent = "Cámara activada";
        capturar.disabled = false;
    } catch (error) {
        console.error("Error al activar la cámara:", error);

        estado.textContent =
            "No se pudo activar la cámara. Revisa los permisos del navegador.";
    }
}

// Capturar fotografía y guardarla con frase y ubicación.
async function tomarFotografia() {
    if (!usuarioActual) {
        estado.textContent =
            "Espera a que se conecte el archivo colectivo.";
        return;
    }

    if (!camara.videoWidth || !camara.videoHeight) {
        estado.textContent =
            "Espera un momento a que la cámara esté lista.";
        return;
    }

    capturar.disabled = true;

    try {
        const coordenadas = await obtenerUbicacion();

        lienzo.width = camara.videoWidth;
        lienzo.height = camara.videoHeight;

        const contexto = lienzo.getContext("2d");

        contexto.drawImage(
            camara,
            0,
            0,
            lienzo.width,
            lienzo.height
        );

        const imagen = lienzo.toDataURL("image/jpeg", 0.85);
        const fraseCapturada = frase.value.trim();
        const fechaISO = new Date().toISOString();

        estado.textContent = "Guardando fotografía en el archivo…";

        const nombreArchivo =
            `${Date.now()}-${crypto.randomUUID()}.jpg`;

        const ruta =
            `fotografias/${usuarioActual.uid}/${nombreArchivo}`;

        const archivoRef = ref(storage, ruta);

        await uploadString(
            archivoRef,
            imagen,
            "data_url",
            { contentType: "image/jpeg" }
        );

        const urlImagen = await getDownloadURL(archivoRef);

        const documento = await addDoc(collection(db, "momentos"), {
            imagen: urlImagen,
            rutaImagen: ruta,
            frase: fraseCapturada,
            fechaISO: fechaISO,
            fecha: serverTimestamp(),
            ubicacion: coordenadas,
            autorId: usuarioActual.uid
        });

        const registro = {
            id: documento.id,
            imagen: urlImagen,
            rutaImagen: ruta,
            frase: fraseCapturada,
            fechaISO: fechaISO,
            ubicacion: coordenadas,
            autorId: usuarioActual.uid
        };

        mostrarRegistro(registro);

        frase.value = "";
        caracteres.textContent = "0";

        estado.textContent = coordenadas
            ? "¡Fotografía y ubicación guardadas!"
            : "¡Fotografía guardada sin ubicación GPS!";

    } catch (error) {
        console.error("Error al guardar la fotografía:", error);

        estado.textContent =
            "No se pudo guardar. Revisa tu conexión y las reglas de Firebase.";
    } finally {
        capturar.disabled = false;
    }
}

// Obtener las coordenadas GPS.
function obtenerUbicacion() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            ubicacion.textContent =
                "Este navegador no permite obtener la ubicación.";

            resolve(null);
            return;
        }

        if (!window.isSecureContext) {
            ubicacion.textContent =
                "La ubicación requiere HTTPS o localhost.";

            resolve(null);
            return;
        }

        ubicacion.textContent = "Buscando tu ubicación GPS…";

        navigator.geolocation.getCurrentPosition(
            (posicion) => {
                const coordenadas = {
                    latitud: posicion.coords.latitude,
                    longitud: posicion.coords.longitude
                };

                const precision = Math.round(
                    posicion.coords.accuracy
                );

                ubicacion.textContent =
                    `GPS obtenido: ${coordenadas.latitud.toFixed(6)}, ` +
                    `${coordenadas.longitud.toFixed(6)} ` +
                    `(precisión aproximada: ${precision} m)`;

                resolve(coordenadas);
            },
            (error) => {
                console.error(
                    "Error al obtener GPS:",
                    error.code,
                    error.message
                );

                const mensajes = {
                    1: "Permiso de ubicación denegado.",
                    2: "No se pudo determinar la ubicación.",
                    3: "La búsqueda de ubicación tardó demasiado."
                };

                ubicacion.textContent =
                    (mensajes[error.code] ||
                    "No se pudo obtener la ubicación.") +
                    " La fotografía se guardará sin GPS.";

                resolve(null);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );
    });
}

// Cargar las fotografías compartidas.
async function cargarGaleria() {
    try {
        const consulta = query(
            collection(db, "momentos"),
            orderBy("fechaISO", "desc"),
            limit(100)
        );

        const resultado = await getDocs(consulta);

        galeria.replaceChildren();

        if (resultado.empty) {
            mostrarMensajeVacio();
            return;
        }

        resultado.forEach((documento) => {
            mostrarRegistro({
                id: documento.id,
                ...documento.data()
            }, false);
        });
    } catch (error) {
        console.error("Error al cargar la galería:", error);

        estado.textContent =
            "No se pudo cargar la galería. Revisa Firestore y sus reglas.";
    }
}

function mostrarMensajeVacio() {
    const mensaje = document.createElement("p");
    mensaje.id = "vacio";
    mensaje.textContent =
        "Todavía no hay fotografías. ¡Registra la primera!";

    galeria.appendChild(mensaje);
}

// Mostrar cada fotografía, sus datos y el botón de eliminación.
function mostrarRegistro(registro, alInicio = true) {
    if (
        registro.id &&
        document.getElementById(`registro-${registro.id}`)
    ) {
        return;
    }

    const tarjeta = document.createElement("article");
    tarjeta.className = "registro";

    if (registro.id) {
        tarjeta.id = `registro-${registro.id}`;
    }

    const foto = document.createElement("img");
    foto.src = registro.imagen;
    foto.alt = registro.frase
        ? `Fotografía: ${registro.frase}`
        : "Fotografía del archivo cotidiano";
    foto.loading = "lazy";

    const detalles = document.createElement("div");
    detalles.className = "detalles";

    const textoFrase = document.createElement("p");
    textoFrase.className = "frase-registro";
    textoFrase.textContent = registro.frase || "Sin frase.";

    const fecha = document.createElement("p");
    fecha.className = "fecha-registro";

    const fechaObjeto = registro.fechaISO
        ? new Date(registro.fechaISO)
        : null;

    fecha.textContent =
        fechaObjeto && !Number.isNaN(fechaObjeto.getTime())
            ? fechaObjeto.toLocaleString("es-MX", {
                dateStyle: "medium",
                timeStyle: "short"
            })
            : "Fecha no disponible";

    const textoCoordenadas = document.createElement("p");
    textoCoordenadas.className = "fecha-registro";

    const enlaceMapa = document.createElement("a");
    enlaceMapa.className = "mapa-enlace";
    enlaceMapa.target = "_blank";
    enlaceMapa.rel = "noopener noreferrer";
    enlaceMapa.textContent = "Ver ubicación en OpenStreetMap";

    const latitud = registro.ubicacion?.latitud;
    const longitud = registro.ubicacion?.longitud;

    if (
        Number.isFinite(latitud) &&
        Number.isFinite(longitud) &&
        latitud >= -90 &&
        latitud <= 90 &&
        longitud >= -180 &&
        longitud <= 180
    ) {
        textoCoordenadas.textContent =
            `Coordenadas GPS: ${latitud.toFixed(6)}, ` +
            `${longitud.toFixed(6)}`;

        enlaceMapa.href =
            `https://www.openstreetmap.org/?mlat=${latitud}` +
            `&mlon=${longitud}#map=16/${latitud}/${longitud}`;
    } else {
        textoCoordenadas.textContent = "Ubicación no compartida.";
        enlaceMapa.hidden = true;
    }

    detalles.append(
        textoFrase,
        fecha,
        textoCoordenadas,
        enlaceMapa
    );

    // Mostrar eliminar solo para el autor de la fotografía.
    if (
        registro.id &&
        registro.autorId &&
        registro.autorId === usuarioActual?.uid
    ) {
        const botonEliminar = document.createElement("button");

        botonEliminar.type = "button";
        botonEliminar.textContent = "Eliminar fotografía";
        botonEliminar.className = "boton-eliminar";

        botonEliminar.addEventListener("click", async () => {
            const confirmar = confirm(
                "¿Seguro que quieres eliminar esta fotografía? " +
                "Esta acción no se puede deshacer."
            );

            if (!confirmar) return;

            botonEliminar.disabled = true;
            estado.textContent = "Eliminando fotografía…";

            try {
                // Primero borrar la imagen de Storage.
                if (registro.rutaImagen) {
                    await deleteObject(
                        ref(storage, registro.rutaImagen)
                    );
                }

                // Después borrar el documento de Firestore.
                await deleteDoc(
                    doc(db, "momentos", registro.id)
                );

                tarjeta.remove();

                if (!galeria.querySelector(".registro")) {
                    mostrarMensajeVacio();
                }

                estado.textContent =
                    "Fotografía eliminada del archivo colectivo.";

            } catch (error) {
                console.error(
                    "Error al eliminar la fotografía:",
                    error
                );

                estado.textContent =
                    "No se pudo eliminar. Revisa las reglas de Storage y Firestore.";

                botonEliminar.disabled = false;
            }
        });

        detalles.appendChild(botonEliminar);
    }

    tarjeta.append(foto, detalles);

    const vacio = document.getElementById("vacio");
    if (vacio) vacio.remove();

    if (alInicio) {
        galeria.prepend(tarjeta);
    } else {
        galeria.append(tarjeta);
    }
}
