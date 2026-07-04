# Anunciando el Servidor del Protocolo de Contexto del Modelo (MCP) de Orbitali: Construye Agentes de Voz Directamente desde Tu IDE

![Anunciando el Servidor del Protocolo de Contexto del Modelo (MCP) de Orbitali: Construye Agentes de Voz Directamente desde Tu IDE](header.png)

Deja de escribir llamadas REST repetitivas. Ahora tus agentes de codificación AI pueden crear, modificar y gestionar dinámicamente agentes de voz de Orbitali durante tu flujo de trabajo de desarrollo.

En los últimos meses, la forma en que los desarrolladores construyen software ha cambiado fundamentalmente. Ya no estamos escribiendo código en aislamiento; estamos programando en pareja con asistentes AI como Claude Code, Cursor y Windsurf. Estos asistentes no solo sugieren líneas de autocompletado: leen bases de código, buscan documentación, ejecutan comandos de shell y construyen características completas desde cero.

Sin embargo, un punto importante de fricción permanecía: conectar estos asistentes de codificación a servicios externos. Si querías que tu compañero de codificación AI configurara o probara un servicio externo como **Orbitali**, tenía que pedirte que hicieras clic en un panel web o que copiaras y pegaras comandos curl de API de la documentación.

Hoy, estamos eliminando esa barrera. Nos complace anunciar el lanzamiento del **Servidor del Protocolo de Contexto del Modelo (MCP) de Orbitali**, una herramienta de código abierto que permite a tus asistentes de codificación AI interactuar directamente con la infraestructura de voz en tiempo real de Orbitali.

---

## ¿Qué es MCP?

Desarrollado por Anthropic, el **Protocolo de Contexto del Modelo (MCP)** es un estándar abierto que permite a los modelos de AI conectarse de manera segura a fuentes de datos y herramientas externas. Piénsalo como un puerto USB-C para AI: una vez que un servicio implementa un servidor MCP, cualquier cliente AI compatible (como Claude Code o Cursor) puede entender e interactuar de inmediato con sus herramientas, API y recursos.

Al lanzar nuestro propio servidor MCP, estamos dando a tus agentes de codificación locales un conjunto de "manos" para construir, modificar y probar recepcionistas de voz de Orbitali directamente dentro de tu espacio de trabajo de desarrollo.

---

## Cómo Funciona: La Arquitectura

El servidor MCP de Orbitali se ejecuta localmente en tu máquina. Se lanza por tu agente de codificación a través de la entrada/salida estándar (`stdio`) y se comunica de manera segura con la puerta de enlace API pública de Orbitali (`/public/v1`) utilizando tu clave API.

```
┌────────────────────────┐           stdio (Local)           ┌────────────────────────┐
│   TU AGENTE DE CODIFICACIÓN    │ ────────────────────────────────> │  SERVIDOR MCP DE ORBITALI   │
│  - Claude / Cursor     │ <──────────────────────────────── │  - Tiempo de ejecución local  │
└────────────────────────┘                                   └───────────┬────────────┘
                                                                         │
                                                             HTTPS       │  Solicitud API
                                                             (Segura)    │  con clave API
                                                                         ▼
                                                             ┌─────────────────────────┐
                                                             │  API PÚBLICA DE ORBITALI    │
                                                             │ https://api.orbitali.ai │
                                                             └─────────────────────────┘
```

En lugar de requerir que tu agente escriba llamadas REST en bruto, analice esquemas de carga útil y maneje la autenticación manualmente, el servidor MCP expone **herramientas seguras para el flujo de trabajo**. El agente simplemente llama a funciones de alto nivel, y el servidor MCP las traduce en interacciones API correctas.

---

## Capacidades y Herramientas Clave

El servidor MCP expone un rico conjunto de herramientas para gestionar tu infraestructura de voz:

### 1. Gestión del Ciclo de Vida del Agente de Voz
* **`list_agents`**: Recupera todos los agentes de voz en tu cuenta, incluyendo sus mensajes, modelos de voz y configuraciones de webhook.
* **`get_or_create_agent`**: Recupera un agente existente por nombre o crea uno nuevo sobre la marcha.
* **`patch_agent`**: Actualiza programáticamente parámetros del agente como el mensaje del sistema, idioma, modelo de voz (por ejemplo, configuraciones de voz a voz), temperatura y latencia de respuesta.

### 2. Vinculación de Herramientas Personalizadas a Agentes de Voz
* **`list_agent_tools`**: Lista las funciones que el agente de voz puede llamar durante una llamada telefónica.
* **`ensure_agent_tools`**: Permite al agente de codificación vincular nuevas herramientas (como webhooks de reservas o búsquedas en bases de datos) al recepcionista de voz, asegurando que el agente de voz tenga el esquema API correcto para obtener datos del mundo real durante la conversación.

### 3. Gestión de RAG de Base de Conocimiento
* **`list_knowledge_documents`**: Consulta documentos adjuntos al agente.
* **`upload_knowledge_document`**: Sube archivos `.txt`, `.md` o `.pdf` a la base de conocimiento del agente, dándole contexto instantáneo (como catálogos de productos o políticas de la empresa) para referenciar durante las llamadas.
* **`delete_knowledge_document`**: Elimina documentos obsoletos de la memoria del agente.

### 4. Pruebas de Sesión en Tiempo Real Directas
* **`create_realtime_session`**: Genera credenciales WebRTC efímeras para que puedas iniciar una sesión de voz de baja latencia de inmediato y probar el modelo de voz a voz del agente localmente.

---

## Comenzando en 60 Segundos

El servidor se distribuye a través de npm y se ejecuta utilizando Node o Bun. Para configurarlo con tu asistente de codificación favorito, necesitarás una clave API de Orbitali (disponible en el panel de Orbitali bajo **Configuración → Claves API**).

### Con Claude Code
Ejecuta el siguiente comando para instalar y registrar automáticamente el servidor:

```bash
claude mcp add orbitali --env ORBITALI_API_KEY=sk_your_key -- bunx @orbitali/mcp
```

### Con Cursor o Windsurf
Agrega la configuración directamente al archivo `.cursor/mcp.json` o `.windsurf/mcp.json` de tu proyecto:

```json
{
  "mcpServers": {
    "orbitali": {
      "command": "bunx",
      "args": ["@orbitali/mcp"],
      "env": {
        "ORBITALI_API_KEY": "sk_your_key",
        "ORBITALI_API_BASE_URL": "https://api.orbitali.ai"
      }
    }
  }
}
```

---

## Un Recorrido en el Mundo Real

Veamos cómo esto cambia tu flujo de trabajo diario. Imagina que estás construyendo un sistema de reservas para dentistas. Has escrito un servidor local de Express para manejar las reservas.

Con el servidor MCP de Orbitali habilitado, puedes escribir un solo mensaje a tu asistente de codificación:

> "Crea un recepcionista de voz llamado 'Bot de Recepción Dental' que ayude a los pacientes a reservar citas. Vincúlalo a mi punto de entrada POST local en `https://b832-72-10.ngrok-free.app/api/bookings`, y sube `clinic_hours.md` para contexto. Finalmente, dame un comando para probarlo."

Tu agente de codificación ejecutará autónomamente lo siguiente:
1. Analizará la estructura de tu API local y leerá `clinic_hours.md`.
2. Ejecutará **`get_or_create_agent`** para registrar `Bot de Recepción Dental` con los ajustes de voz.
3. Ejecutará **`upload_knowledge_document`** para adjuntar `clinic_hours.md` a la memoria del agente.
4. Ejecutará **`ensure_agent_tools`** para registrar la herramienta de reservas con el esquema JSON correcto, apuntando a tu túnel ngrok.
5. Ejecutará **`create_realtime_session`** para obtener un token WebRTC y generar un enlace de prueba.

En segundos, el agente devuelve:
> *"He creado el agente de voz, subido las horas y vinculado la herramienta de reservas. Puedes probar tu agente ejecutando este script de cliente WebRTC o navegando a la consola de pruebas de Orbitali."*

No tuviste que escribir una sola solicitud API, formatear una carga útil JSON o dejar tu terminal.

---

## Código Abierto y Extensible

Creemos que las herramientas para desarrolladores deben ser abiertas y transparentes. El servidor MCP de Orbitali es completamente de código abierto y está alojado en GitHub. Si deseas revisar el código fuente, informar un problema o agregar herramientas personalizadas, visita el repositorio:

👉 **[github.com/orbitaliai/mcp](https://github.com/orbitaliai/mcp)**

¡No podemos esperar a ver las aplicaciones de voz que construyas con Orbitali y MCP! Comienza hoy y deja que tu asistente de codificación haga el trabajo pesado.