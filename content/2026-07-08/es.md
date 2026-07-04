# Presentamos el servidor Model Context Protocol (MCP) de Orbitali: construye agentes de voz directamente desde tu IDE

![Presentamos el servidor Model Context Protocol (MCP) de Orbitali: construye agentes de voz directamente desde tu IDE](header.png)

Olvídate del código boilerplate para llamadas REST. Ahora tus agentes de código de IA pueden crear, modificar y gestionar dinámicamente agentes de voz de Orbitali durante tu flujo de desarrollo.

En los últimos meses, la forma en que los desarrolladores construyen software ha cambiado fundamentalmente. Ya no escribimos código en solitario; hacemos pair programming con asistentes de IA como Claude Code, Cursor y Windsurf. Estos asistentes no solo sugieren autocompletados; leen bases de código, buscan documentación, ejecutan comandos en la terminal y desarrollan funcionalidades completas desde cero.

Sin embargo, existía un punto importante de fricción: conectar estos asistentes de código a servicios externos. Si querías que tu compañero de IA configurara o probara un servicio externo como **Orbitali**, tenía que pedirte que navegaras por el dashboard web o copiaras y pegaras comandos curl desde la documentación de la API.

Hoy eliminamos esa barrera. Nos complace presentar el **servidor de Model Context Protocol (MCP) de Orbitali**, una herramienta de código abierto que permite a tus asistentes de código de IA interactuar directamente con nuestra infraestructura de voz en tiempo real.

---

## ¿Qué es MCP?

Creado por Anthropic, el **Model Context Protocol (MCP)** es un estándar abierto que permite a los modelos de IA conectarse de manera segura a herramientas y fuentes de datos externas. Piénsalo como un puerto USB-C para la IA: una vez que un servicio implementa un servidor MCP, cualquier cliente compatible (como Claude Code o Cursor) puede entender e interactuar de inmediato con sus herramientas, APIs y recursos.

Con el lanzamiento de nuestro servidor MCP, damos a tus agentes de código locales un conjunto de "manos" para crear, modificar y probar asistentes de voz de Orbitali directamente desde tu entorno de desarrollo.

---

## Cómo funciona: la arquitectura

El servidor MCP de Orbitali se ejecuta localmente en tu máquina. Tu agente de código lo inicia a través de la entrada/salida estándar (`stdio`) para comunicarse de forma segura con la API pública de Orbitali (`/public/v1`) utilizando tu API key.

```
┌────────────────────────┐           stdio (Local)           ┌────────────────────────┐
│   TU AGENTE DE CÓDIGO  │ ────────────────────────────────> │  SERVIDOR MCP DE ORBITALI   │
│  - Claude / Cursor     │ <──────────────────────────────── │  - Runtime local (Node/Bun) │
└────────────────────────┘                                   └───────────┬────────────┘
                                                                         │
                                                             HTTPS       │  Petición API
                                                             (Segura)    │  con API Key
                                                                         ▼
                                                             ┌─────────────────────────┐
                                                             │  API PÚBLICA DE ORBITALI    │
                                                             │ https://api.orbitali.ai │
                                                             └─────────────────────────┘
```

En lugar de obligar a tu agente a escribir peticiones REST desde cero, estructurar payloads o gestionar la autenticación de forma manual, el servidor MCP expone **herramientas optimizadas y seguras**. El agente simplemente llama a funciones de alto nivel y el servidor MCP las traduce en peticiones de API correctas.

---

## Herramientas y capacidades clave

El servidor MCP expone un rico conjunto de herramientas para gestionar tu infraestructura de voz:

### 1. Gestión del ciclo de vida de los agentes de voz
* **`list_agents`**: Obtiene todos los agentes de voz de tu cuenta, con sus instrucciones (prompts), modelos de voz y webhooks.
* **`get_or_create_agent`**: Obtiene un agente existente por nombre o crea uno nuevo al instante.
* **`patch_agent`**: Modifica de forma programática parámetros como el prompt del sistema, el idioma, el modelo de voz (por ejemplo, configuración de speech-to-speech), la temperatura y la latencia.

### 2. Integración de herramientas personalizadas
* **`list_agent_tools`**: Lista las funciones que el agente de voz puede llamar durante una llamada telefónica.
* **`ensure_agent_tools`**: Permite al agente de código asociar nuevas herramientas (como webhooks de reserva o consultas a bases de datos) al asistente de voz. Esto asegura que el agente de voz tenga el esquema de API correcto para interactuar con datos en tiempo real durante la llamada.

### 3. Gestión de base de conocimiento (RAG)
* **`list_knowledge_documents`**: Lista los documentos adjuntos al agente.
* **`upload_knowledge_document`**: Sube archivos `.txt`, `.md` o `.pdf` a la base de conocimiento del agente, proporcionándole contexto inmediato (como catálogos o políticas internas) para consultar durante la conversación.
* **`delete_knowledge_document`**: Elimina archivos obsoletos de la memoria del agente.

### 4. Pruebas de sesión en tiempo real
* **`create_realtime_session`**: Genera credenciales WebRTC temporales para iniciar una sesión de voz de baja latencia al instante y probar el modelo de speech-to-speech directamente.

---

## Configuración en 60 segundos

El servidor se distribuye a través de npm y funciona con Node o Bun. Para añadirlo a tu asistente de código preferido, necesitarás una clave de API de Orbitali (disponible en el dashboard en **Settings → API keys**).

### Con Claude Code
Ejecuta este comando para instalar y registrar el servidor de forma automática:

```bash
claude mcp add orbitali --env ORBITALI_API_KEY=sk_your_key -- bunx @orbitali/mcp
```

### Con Cursor o Windsurf
Añade la configuración a `.cursor/mcp.json` o `.windsurf/mcp.json` en tu proyecto:

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

## Un caso de uso real

Veamos cómo cambia tu día a día. Imagina que estás desarrollando un sistema de reservas para una clínica dental y has escrito un servidor local con Express.

Con el servidor MCP de Orbitali activo, solo tienes que pedirle a tu asistente de código:

> "Crea un asistente de voz llamado 'Bot Dental' que ayude a los pacientes a reservar citas. Conéctalo a mi endpoint POST local en `https://b832-72-10.ngrok-free.app/api/bookings` y sube `clinic_hours.md` como contexto. Al terminar, dame un comando para probarlo."

Tu agente de código realizará los siguientes pasos de forma autónoma:
1. Analizará el código de tu API local y leerá `clinic_hours.md`.
2. Llamará a **`get_or_create_agent`** para registrar el bot con la configuración de voz adecuada.
3. Ejecutará **`upload_knowledge_document`** para añadir `clinic_hours.md` a la base de conocimiento.
4. Usará **`ensure_agent_tools`** para registrar la función de reservas con su esquema JSON, apuntando al túnel de ngrok.
5. Ejecutará **`create_realtime_session`** para obtener un token WebRTC y generar un enlace de prueba.

En cuestión de segundos, tu agente te responderá:
> *"He creado el agente de voz, subido los horarios y configurado la herramienta de reservas. Puedes probarlo ejecutando este script de cliente WebRTC o abriendo la consola de pruebas de Orbitali."*

No habrás tenido que escribir una sola petición de API, estructurar JSONs a mano ni salir de la terminal.

---

## Código abierto y extensible

Creemos que las herramientas para desarrolladores deben ser abiertas y transparentes. Por eso, el servidor MCP de Orbitali es completamente open-source. Si quieres revisar el código, reportar un issue o añadir integraciones personalizadas, visita nuestro repositorio:

👉 **[github.com/orbitaliai/mcp](https://github.com/orbitaliai/mcp)**

¡Estamos deseando ver qué aplicaciones de voz construyes con Orbitali y MCP! Pruébalo hoy mismo y deja que tu asistente de código haga el trabajo pesado.