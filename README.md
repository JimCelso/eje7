# Atlas de lo cotidiano

Aplicación web para capturar fotografías, agregar una frase y compartirlas en
una galería con ubicación opcional.

## Configuración de Firebase

1. En Firebase Console, abre la configuración del proyecto y copia la
   configuración de la aplicación web.
2. Sustituye los valores de `firebaseConfig` en `firebase.js` por los de esa
   aplicación. La `apiKey` del navegador no es una contraseña; restringe su uso
   al dominio de la aplicación y permite las APIs de Firebase que utiliza el
   proyecto.
3. En Authentication, habilita el proveedor **Anónimo**.
4. Crea/habilita Firestore y Firebase Storage. Configura reglas para que la
   galería pueda leerse y cada usuario solo pueda crear y eliminar sus propios
   registros y archivos. Este repositorio no incluye archivos de reglas de
   Firestore o Storage; verifica las reglas del proyecto antes de publicar.
5. Añade el dominio de la aplicación a los dominios autorizados de Firebase
   Authentication.

Si aparece `auth/api-key-not-valid`, vuelve a copiar la configuración web del
proyecto y verifica que la clave API esté activa, que corresponda al mismo
proyecto y que sus restricciones permitan el dominio de la aplicación y la
Identity Toolkit API. Habilitar el proveedor anónimo no corrige una clave API
inválida.

## Desarrollo y publicación

Sirve el directorio del proyecto desde un servidor local; la cámara y la
ubicación requieren HTTPS o `localhost`. Para Firebase Hosting, inicia sesión
con Firebase CLI, selecciona el proyecto correcto y ejecuta:

```sh
npx firebase-tools deploy --only hosting
```

El código de Cloud Functions en `archivo-fotografico/` es una plantilla y no
contiene funciones activas.