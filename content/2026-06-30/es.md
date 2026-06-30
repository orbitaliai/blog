# Presentamos Orbitali: Por qué cambiamos el pipeline de IA de voz por un único modelo en tiempo real

![Presentamos Orbitali: Por qué cambiamos el pipeline de IA de voz por un único modelo en tiempo real](header.png)

La mayoría de las recepcionistas de IA de voz te dejan con un incómodo silencio de "¡¿hola?!... ¿hola?" de un segundo y medio.

Seguro que conoces la sensación. Llamas a una empresa, te responde una voz automatizada y expones tu solicitud. Y de repente... *nada*. Un silencio incómodo de 1,5 segundos se apodera de la línea. Te preguntas si se ha cortado la llamada. Abres la boca para decir "¿hola?" de nuevo justo cuando la IA empieza a hablar, lo que provoca una colisión conversacional robótica y frustrante.

Este retraso de 1,5 segundos no es solo molesto; es un asesino de la conversión de usuarios. En las conversaciones entre humanos, la ventana de respuesta natural es extremadamente estrecha: entre 200 ms y 400 ms. En cuanto un agente tarda más de 600 ms en responder, el cerebro humano detecta una brecha incómoda. Y si el retraso supera los 900 ms, la fluidez de la conversación se rompe por completo.

Hoy lanzamos la beta pública para desarrolladores de **Orbitali** para solucionar este problema de raíz.

Orbitali es una capa de infraestructura de agentes de IA de voz en tiempo real que permite a los desarrolladores compilar, desplegar, operar y observar agentes de voz conversacionales que alcanzan tiempos de respuesta humanos nativos de entre **300 ms y 500 ms**. Y lo hemos conseguido no retocando código antiguo, sino eliminando por completo la arquitectura tradicional de múltiples proveedores que domina la industria.

A continuación, os mostramos con total transparencia cómo funciona nuestra tecnología, por qué el pipeline tradicional de IA de voz está técnicamente obsoleto para el tiempo real y las decisiones de ingeniería que tomamos para lograr una conversación humana a escala.

---

## La arquitectura defectuosa del pipeline de IA de voz tradicional

Para entender por qué los bots de voz actuales parecen sistemas telefónicos lentos y pesados, hay que analizar su infraestructura subyacente. Casi todas las plataformas de orquestación de voz del mercado actual actúan como un mero "conector de tuberías" (*pipeline wrangler*). Encadenan tres sistemas completamente independientes de tres proveedores distintos para procesar cada turno de la conversación:

$$	ext{Speech-to-Text (STT)} \longrightarrow 	ext{Large Language Model (LLM)} \longrightarrow 	ext{Text-to-Speech (TTS)}$$

Cada vez que un usuario habla por teléfono o a través del navegador, esta arquitectura tradicional ejecuta los siguientes saltos de red:

1. **La fase de transcripción (STT):** El flujo de audio entrante se captura, se empaqueta en fragmentos y se envía a una API externa de reconocimiento de voz (como Deepgram o AssemblyAI). El modelo debe esperar a que se pronuncie una frase o una oración completa para devolver una cadena de texto limpia.
2. **La fase de razonamiento (LLM):** El texto transcrito se envía por la red al proveedor del modelo de lenguaje (como OpenAI o Anthropic). El LLM procesa el texto, genera la respuesta y comienza a transmitir tokens de texto de vuelta.
3. **La fase de síntesis (TTS):** Los tokens de texto generados se introducen en un motor de texto a voz (como ElevenLabs o Cartesia) para convertirse de nuevo en ondas de audio.
4. **La fase de entrega:** El flujo de audio resultante se empaqueta finalmente y se redirige a la pasarela de telefonía del operador para que llegue al oído del usuario.

### El impuesto de la latencia: Por qué fallan los pipelines
Aunque optimices cada fase de este pipeline, estás luchando contra las leyes de las redes y de la computación. Cada transferencia de datos entre proveedores de API distintos introduce **latencia de red interservicio**.

Además, pagas una penalización por el retraso de procesamiento acumulado. Si el STT tarda 200 ms, el LLM tarda 400 ms en generar el contexto de la respuesta y el TTS requiere otros 300 ms para sintetizar los matices de la voz, la latencia base ya es de 900 ms. Si sumamos el enrutamiento de paquetes de red a través de centros de datos de distintas nubes, entramos de lleno en el territorio del incómodo "silencio robótico" de 1,5 segundos.

Ningún nivel de astucia en ingeniería puede eludir esta realidad estructural. Cuando diseñas una arquitectura basada en tres recargos comerciales acumulados y tres relaciones de API independientes, estás optimizando la variedad de componentes a expensas directas de la experiencia del usuario final.

---

## El replanteamiento de la infraestructura: voz a voz en una sola pasada

En Orbitali, desarrollamos nuestro motor de ejecución con una única premisa fundamental: **la latencia es la funcionalidad clave**. Si un recepcionista de IA de voz no responde lo suficientemente rápido como para parecer humano, nada de lo que haga importa.

Para alcanzar nuestros objetivos de tiempo de respuesta de 300–500 ms, eliminamos por completo el pipeline tradicional multiproveedor. Orbitali opera sobre una arquitectura de modelo único, en tiempo real y **directamente de voz a voz**.

```
[Flujo de audio del usuario] ──(Conexión de red directa)──> [Servicio de agente Go de Orbitali]
                                                                     │
                                                       (Paso único del modelo nativo)
                                                                     │
                                                                     ▼
[Flujo del operador] <───(Respuesta en 300-500ms)─────────── [Gemini Live vía Vertex AI]
```

Bajo el capó, aprovechamos el potencial de **Gemini Live a través de Google Cloud Vertex AI**.

En lugar de procesar la transcripción de audio, el razonamiento textual y la síntesis de voz como tareas secuenciales, Gemini Live gestiona las tres de forma nativa dentro de una única capa de modelo en una sola pasada. No existe un paso de traducción de audio a texto que destruya el tono o la cadencia, ni una etapa de síntesis de texto a voz que añada latencia. Los bytes de audio bruto fluyen directamente hacia el modelo, y los bytes de audio salientes se transmiten de inmediato, comenzando antes incluso de que la respuesta completa haya terminado de calcularse.

Al ejecutar nuestra infraestructura sin estado basada en Go (`orbitali-agent`) en regiones con alta compatibilidad de residencia de datos (como `europe-west4`), reducimos los saltos de red al milisegundo. Evitamos por completo el caos de las redes interservicio. Orbitali actúa estrictamente como un orquestador en tiempo real altamente optimizado, alimentando el contexto del modelo único y ejecutando la lógica de negocio del desarrollador de forma fluida.

---

## El compromiso intencionado: rendimiento frente a personalización

Sabemos perfectamente lo que preguntarán algunos desarrolladores de grandes empresas: *"¿Puedo sustituir el modelo subyacente por mi propio LLM de código abierto ajustado? ¿Puedo integrar un proveedor de voz personalizado que me guste?"*

Nuestra respuesta es tajante: **No.** Y se trata de una restricción explícita e intencionada, no de un descuido.

Hemos renunciado deliberadamente al intercambio de proveedores a la carta a cambio de conseguir un agente que realmente se sienta como un ser humano real al otro lado del teléfono. Las plataformas que permiten una personalización absoluta te obligan a gestionar una complejidad de integración inmensa y a aceptar la degradación del rendimiento propia del pipeline multiproveedor.

Al estandarizar nuestro servicio en una única arquitectura de modelo de alto rendimiento, aportamos ventajas fundamentales a los equipos de ingeniería:

* **Simplicidad operativa:** No necesitas lidiar con tres claves de suscripción diferentes, monitorizar el tiempo de actividad de múltiples plataformas de infraestructura, ni preocuparte de si una actualización en la API de síntesis de voz estropeará el formato de tus instrucciones (*prompts*). Una única plataforma se encarga de todo.
* **Transmisión bidireccional real e interrupción inmediata (*barge-in*):** Dado que el modelo de voz es nativamente consciente de los parámetros de audio entrantes, gestiona las interrupciones naturales del usuario al instante. Si el agente de IA está hablando y el interlocutor le interrumpe diciendo *"Espera, déjame cambiar esa hora"*, Orbitali detecta el flujo de audio entrante, corta inmediatamente la generación de voz saliente y se vuelve a concentrar en las palabras del cliente. Es un fiel reflejo del comportamiento telefónico humano.
* **Precios transparentes sin recargos ocultos:** Como no tenemos que repercutir tres márgenes comerciales acumulados, ofrecemos una tarifa de ejecución plana y transparente de **0,10 €/minuto** (medida en intervalos precisos de 10 segundos) en todos nuestros planes, que se descuenta de tu asignación mensual base.

---

## Separación estricta de responsabilidades: tú controlas la lógica, nosotros ejecutamos el agente

A pesar de que restringimos la configuración del modelo para preservar la latencia, ofrecemos flexibilidad absoluta en lo que respecta a los datos de tu aplicación. Orbitali mantiene una estricta separación de responsabilidades: los registros de tus clientes, las reglas personalizadas y los datos de tu infraestructura permanecen íntegramente en tu propio servidor.

```
┌─────────────────────────────────┐                 ┌───────────────────────────┐
│     ENTORNO DE ORBITALI         │                 │   BACKEND DEL DESARROLLADOR│
│  - Transmisión de voz de baja   │  agent:tool-call │  - CRM de clientes / APIs │
│    latencia                     │ ────────────────> │  - Reservas y             │
│  - Arquitectura Gemini Live     │ <──────────────── │    disponibilidad         │
│  - Motor RAG pgvector nativo    │   Respuesta JSON  │  - Lógica propietaria     │
└─────────────────────────────────┘                 └───────────────────────────┘
```

Cuando creas un agente en Orbitali, puedes aprovechar primitivas de desarrollo avanzadas mediante webhooks:

### 1. Instrucciones dinámicas (*Dynamic Prompts* - Antes de la llamada)
Las instrucciones estáticas limitan la utilidad de una IA. Con Orbitali, puedes configurar tu agente con un webhook de `Server URL`. En el mismo milisegundo en que una llamada entrante llega a tu línea telefónica, Orbitali envía una petición a tu servidor backend con un evento `agent:assistant-request` que contiene los metadatos del llamante. Tu backend puede consultar instantáneamente ese número en tu CRM y devolver una instrucción o saludo completamente dinámico y personalizado:

> *"Hola Alejandro, bienvenido de nuevo a tu nivel de cuenta Platinum. Veo que tu vuelo se ha retrasado..."*

### 2. Herramientas de API en directo (A mitad de la conversación)
Los agentes de voz deben ejecutar tareas, no solo hablar. Orbitali admite herramientas personalizadas para desarrolladores (*Developer Tools*) definidas mediante parámetros sencillos de JSON Schema. Cuando la conversación activa una acción —como reservar una cita en una clínica o comprobar el estado de un pedido—, Orbitali pausa la generación de audio y envía un evento de webhook `agent:tool-call` a tu servidor. Tu servidor ejecuta la lógica de negocio local, devuelve una respuesta JSON estándar y el agente continúa hablando con total fluidez.

### 3. RAG nativo sin configuración
Si manejas extensas fichas de producto, políticas internas complejas o secciones amplias de preguntas frecuentes, no necesitas saturar tus instrucciones del sistema ni construir una API de búsqueda externa que ralentice el proceso. Puedes subir documentos en formato Markdown o PDF directamente al panel de control de Orbitali. Nuestra plataforma fragmenta y genera los vectores de tus datos automáticamente en una base de datos vectorial nativa (`pgvector`). Cuando el agente necesita información, ejecuta internamente una herramienta de búsqueda de similitud semántica optimizada (`search_knowledge`), recuperando respuestas hiperrelevantes con cero latencia añadida.

---

## Diseñado para desarrolladores: Trae tu propio operador (*Bring Your Own Carrier - BYOC*)

Orbitali es una infraestructura pensada para desarrolladores, equipos de producto y agencias de automatización que buscan desplegar bots de voz de nivel de producción para flujos de trabajo entrantes (*inbound*), como recepción, triaje de atención al cliente o líneas de reservas.

Debido a que nos enfocamos de manera exclusiva en construir la mejor capa de ejecución en tiempo real, **no somos un operador telefónico**. No vendemos números de teléfono ni inflamos los costes de telefonía un 300%.

Operamos bajo un estricto modelo de **Trae tu propio operador (BYOC)**. Conectas tus cuentas existentes de Twilio o Telnyx directamente a Orbitali mediante OAuth estándar o webhooks. Mantienes tus tarifas mayoristas con el operador, proteges el cumplimiento de la privacidad de tus datos y conservas la propiedad total sobre tus números de teléfono. Pagas directamente a tu operador por el enrutamiento de la línea y a Orbitali únicamente por los minutos de ejecución de la IA.

*Nota: Orbitali está diseñado específicamente y optimizado para flujos de trabajo de atención de llamadas entrantes. No admitimos campañas de llamadas salientes masivas (robocalling), marcadores automáticos de telemarketing ni campañas de spam. Esta decisión de diseño mantiene nuestra infraestructura libre de tráfico malicioso y nos permite concentrarnos en dar un servicio excepcional a equipos de desarrollo legítimos.*

---

## Únete hoy mismo a la beta pública para desarrolladores

La era de los silencios incómodos en la IA de voz ha llegado a su fin. Al abandonar el defectuoso pipeline multiproveedor y diseñar una plataforma en torno a un único modelo de voz a voz en tiempo real, hemos desbloqueado una capacidad de respuesta verdaderamente humana para las aplicaciones de voz.

Nuestra beta pública para desarrolladores ya está oficialmente disponible. Cada cuenta nueva recibe **5 minutos de prueba gratuitos** (válidos durante 7 días, sin necesidad de introducir tarjeta de crédito) para comprobar la mejora en la latencia de primera mano. A partir de ahí, puedes escalar a producción de forma fluida a través de nuestros flexibles niveles de suscripción:

| Plan | Precio base / mes | Minutos incluidos | Tarifa de exceso | Ideal para |
| :--- | :--- | :--- | :--- | :--- |
| **Launch** | 49 € | 300 | 0,10 € / min | Validar los primeros proyectos mínimos viables (MVP) |
| **Studio** | 199 € | 1.500 | 0,10 € / min | Escalado a producción y análisis detallados |
| **Agency** | 499 € | 5.000 | 0,10 € / min | Agentes activos y líneas concurrentes ilimitadas |

¿Todo listo para construir un agente de voz que realmente suene humano?

* **Empieza de inmediato:** Regístrate y accede al panel de control en [app.orbitali.ai](https://app.orbitali.ai).
* **Revisa la arquitectura:** Explora a fondo los webhooks, las instrucciones dinámicas y los esquemas de herramientas en nuestra documentación completa para desarrolladores.
* **Contacta con los fundadores:** ¿Tienes requisitos de escala altamente personalizados o necesitas un despliegue para tu agencia? Reserva una sesión de consultoría técnica directa a través del enlace de calendario de nuestro panel.