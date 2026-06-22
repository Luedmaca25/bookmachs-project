# Guía de Configuración Manual para Producción (API Keys y Secretos)

Este documento detalla todas las variables de entorno, claves secretas, credenciales de pasarelas de pago y configuraciones que debes llenar de forma **manual e individual** antes del despliegue en producción. Estas llaves no se guardan en el repositorio por razones de seguridad.

---

## 1. Backend: Archivos de Configuración (`appsettings.json`)

Edita el archivo [appsettings.json](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Api/appsettings.json) en el servidor de producción (o utiliza variables de entorno del servidor/IIS) para ingresar las llaves reales.

Recomendamos estructurar el archivo con la siguiente sección de pagos (`Payments`) que actualmente se ejecuta con valores de prueba (Mocks):

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "ConnectionStrings": {
    "DefaultConnection": "Server=TU_SERVIDOR_SQL;Database=BookmachsDb;User Id=TU_USUARIO;Password=TU_CONTRASEÑA;TrustServerCertificate=True;MultipleActiveResultSets=true"
  },
  "Jwt": {
    "Secret": "INGRESAR_AQUI_UN_TOKEN_MUY_LARGO_Y_SEGURO_DE_AL_MENOS_256_BITS_PARA_JWT",
    "Issuer": "BookmachsApi",
    "Audience": "BookmachsClients",
    "ExpiryInMinutes": 1440
  },
  "Google": {
    "ClientId": "TU_GOOGLE_CLIENT_ID_REAL.apps.googleusercontent.com"
  },
  "Payments": {
    "MercadoPagoAccessToken": "APP_USR-TU-MERCADOPAGO-ACCESS-TOKEN-PRODUCCION",
    "TransbankCommerceCode": "TU_CODIGO_DE_COMERCIO_PRODUCCION",
    "TransbankApiKey": "TU_API_KEY_DE_PRODUCCION_TRANSBANK",
    "TransbankEnvironment": "Production"
  },
  "AllowedHosts": "*"
}
```

### Detalle de cada sección del Backend:

#### A. Base de Datos (`ConnectionStrings`)
*   **Llave:** `ConnectionStrings:DefaultConnection`
*   **Dónde obtenerla:** Proveedor de hosting o base de datos de producción (SQL Server en SmarterASP.NET).
*   **Formato estándar:** `Server=sqlXXXXXXXX.smarterasp.net;Database=db_XXXXXXXX;User Id=db_XXXXXXXX_admin;Password=TU_PASSWORD;TrustServerCertificate=True;MultipleActiveResultSets=true`

#### B. Llave Secreta JWT (`Jwt:Secret`)
*   **Llave:** `Jwt:Secret`
*   **Descripción:** Llave simétrica de cifrado para firmar y validar los tokens JWT de sesión.
*   **Acción:** Reemplaza la clave de desarrollo por una cadena aleatoria y compleja de al menos 32 caracteres (256 bits). *¡No reveles esta clave!*

#### C. Google Sign-In SSO (`Google:ClientId`)
*   **Llave:** `Google:ClientId`
*   **Dónde obtenerla:** [Google Cloud Console](https://console.cloud.google.com/) -> APIs y Servicios -> Credenciales.
*   **Acción:** 
    1. Crea un proyecto en Google Cloud.
    2. Configura la pantalla de consentimiento de OAuth.
    3. Crea un ID de cliente de OAuth 2.0 (Tipo: Aplicación Web).
    4. Añade las URI de redirección autorizadas de producción (ej. `https://tudominio.com` y `https://api.tudominio.com`).
    5. Copia el ID de cliente generado y colócalo en esta casilla del backend.

#### D. Mercado Pago SDK (`Payments:MercadoPagoAccessToken`)
*   **Llave:** `Payments:MercadoPagoAccessToken`
*   **Dónde obtenerla:** [Mercado Pago Developers](https://www.mercadopago.cl/developers/) -> Credenciales de Producción.
*   **Importante:** Si esta clave está vacía, contiene `"YOUR_TEST_ACCESS_TOKEN"`, o inicia con `"MOCK_"`, el backend operará de forma automática en **Modo Simulado (Mock)**. Coloca tu `Access Token` oficial para procesar transacciones reales.

#### E. Transbank Webpay Plus (`Payments`)
*   **Llaves:** 
    *   `Payments:TransbankCommerceCode`: Tu código de comercio asignado al darte de alta en Transbank (normalmente provisto tras firmar contrato con Transbank o a través de un integrador).
    *   `Payments:TransbankApiKey`: API Key secreta generada en tu portal de Transbank Developers o de producción.
    *   `Payments:TransbankEnvironment`: Coloca `"Production"` (sensible a mayúsculas) para usar los servidores oficiales de Transbank. Cualquier otro valor obligará al sistema a conectarse al entorno de pruebas (`Integration`).

---

## 2. Frontend: Google SSO Client ID

El ID de cliente de Google también debe actualizarse en el código del Frontend para pintar el botón oficial "Continuar con Google".

*   **Archivo:** [HardGateModal.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/authentication/components/HardGateModal.tsx#L30) (Línea 30)
*   **Código actual:**
    ```typescript
    client_id: '1234567890-googleclientidplaceholder.apps.googleusercontent.com'
    ```
*   **Acción:** Reemplaza `'1234567890-googleclientidplaceholder.apps.googleusercontent.com'` por tu ID de cliente real de Google obtenido en el paso 1.C. *Deben coincidir exactamente el ID del Frontend y el del Backend.*

---

## 3. URLs del Cliente de API (Vite Environment Variables)

Para que el frontend React sepa a qué endpoint del backend enviar las solicitudes en producción, debes configurar las variables de entorno de Vite.

*   **Acción:** Crea un archivo llamado `.env.production` en el directorio de tu frontend: `C:\Users\luis_\Proyectos\bookmachs\frontend\.env.production`
*   **Contenido:**
    ```env
    VITE_API_URL=https://api.tudominio.com/api
    ```
    *(Sustituye por la URL HTTPs real de tu API en SmarterASP.NET).*

---

## 4. Directorio de Almacenamiento Local (Subida de Portadas)

*   **Carpeta:** [uploads](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Api/wwwroot/uploads)
*   **Configuración en VPS IIS:**
    *   Asegúrate de que la cuenta de servicio de IIS (habitualmente `IIS_IUSRS` o `AppPoolIdentity`) tenga permisos de **Lectura, Escritura y Modificación** en la carpeta `/wwwroot/uploads` del backend.
    *   Sin estos permisos, la subida manual de libros (`InventoryPage.tsx` -> `POST /api/books`) fallará con un error `500 Internal Server Error` al intentar guardar la imagen en disco.
