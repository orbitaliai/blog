# Presentamos Orbitali: Por qué cambiamos el pipeline de IA de voz por un único modelo en tiempo real

![Presentamos Orbitali: Por qué cambiamos el pipeline de IA de voz por un único modelo en tiempo real](header.png)

La mayoría de los recepcionistas de voz de IA te dan un "¿hola? ... ¿hola?"

Conoces la sensación. Llamas a un negocio, una voz automatizada responde y expresas tu solicitud. Luego... *nada*. Un silencio incómodo de 1.5 segundos se cierne sobre la línea. Te preguntas si la llamada se cortó. Abres la boca para decir "¿hola?" de nuevo, justo cuando la IA finalmente comienza a hablar, resultando en una incómoda colisión conversacional robótica.

Este retraso de 1.5 segundos no solo es molesto; es un asesino de conversiones. En las conversaciones entre humanos, la ventana de respuesta natural es ajustada: entre 200ms y 400ms. Una vez que un agente tarda más de 600ms en responder, el cerebro humano registra un vacío desconcertante. Cuando se extiende más allá de 900ms, la conversación se descompone por completo.

Hoy, lanzamos **Orbitali en beta pública para desarrolladores** para resolver este problema de forma permanente.

Orbitali es una capa de infraestructura de agente de voz de IA en tiempo real que permite a los desarrolladores construir, desplegar, operar y observar agentes de voz conversacionales que alcanzan tiempos de respuesta humanos naturales de **300–500ms**. Logramos esto no ajustando código antiguo, sino desechando completamente la arquitectura tradicional de múltiples proveedores que domina la industria.

Aquí hay una mirada honesta detrás de escena sobre por qué el pipeline de IA de voz tradicional está fundamentalmente roto para aplicaciones en tiempo real, cómo construimos una mejor capa de ejecución y los deliberados compromisos de ingeniería que hicimos para lograr una verdadera conversación a gran escala.

---

## La Arquitectura Defectuosa del Pipeline de IA de Voz Tradicional

Para entender por qué tu bot de voz actual se siente como un árbol telefónico lento, debes mirar la infraestructura subyacente. Casi todas las principales plataformas de orquestación de voz en el mercado hoy actúan como un "gestor de pipeline". Encadenan tres sistemas completamente separados de tres proveedores diferentes para lograr un único turno de conversación:

$$	ext{Conversión de Voz a Texto (STT)} \longrightarrow 	ext{Modelo de Lenguaje Grande (LLM)} \longrightarrow 	ext{Conversión de Texto a Voz (TTS)}$$

Cada vez que un usuario habla por teléfono o navegador, la arquitectura tradicional ejecuta los siguientes saltos de red:

1. **La Etapa de Transcripción (STT):** La transmisión de audio entrante se captura, se empaqueta y se envía a una API de conversión de voz a texto de terceros (como Deepgram o AssemblyAI). El modelo debe esperar hasta que se hable una frase suficiente o una oración completa para generar una cadena de texto limpia.
2. **La Etapa de Razonamiento (LLM):** La transcripción de texto se envía a través de la red a un proveedor de modelos de lenguaje (como OpenAI o Anthropic). El LLM procesa el texto, calcula la respuesta y comienza a transmitir tokens de texto de vuelta.
3. **La Etapa de Síntesis (TTS):** Los tokens de texto generados se alimentan a un motor de conversión de texto a voz (como ElevenLabs o Cartesia) para ser convertidos de nuevo en formas de onda de audio.
4. **La Etapa de Entrega:** La transmisión de audio compilada se empaqueta finalmente y se envía de vuelta a la puerta de enlace telefónica del operador para llegar al oído del usuario.

### El Impuesto de Latencia: Por qué Fallan los Pipelines
Incluso si optimizas cada una de estas etapas del pipeline, estás luchando contra las leyes básicas de la red y el cómputo. Cada traspaso entre distintos proveedores de API introduce **latencia de red inter-servicios**.

Además, pagas una penalización acumulativa de retraso de procesamiento. Si tu STT tarda 200ms, tu LLM tarda 400ms en generar el contexto de respuesta principal, y tu TTS tarda otros 300ms en sintetizar el matiz emocional del audio, tu latencia base ya está en 900ms. Agrega el enrutamiento de paquetes de red a través de centros de datos en la nube dispares, y aterrizas en el incómodo territorio de "silencio robótico" de 1.5 segundos.

Ninguna cantidad de ingenio puede eludir esta realidad estructural. Cuando construyes una arquitectura basada en tres marcas apiladas y tres relaciones de API separadas, estás optimizando la variedad de componentes a expensas directas de la experiencia del usuario final.

---

## La Reconsideración de la Infraestructura: Conversión de Voz a Voz en un Solo Pase

En Orbitali, construimos nuestra capa de ejecución con una única tesis guía: **la latencia es la característica**. Si un recepcionista de voz de IA no puede responder lo suficientemente rápido como para sentirse humano, nada más que haga importa.

Para alcanzar nuestros tiempos de respuesta objetivo de 300–500ms, colapsamos completamente el pipeline tradicional de múltiples proveedores. Orbitali opera en una arquitectura de modelo **voz a voz** unificada y en tiempo real.

```
[Transmisión de Audio del Usuario] ──(Conexión de Red Directa)──> [Servicio de Orquestación de Orbitali]
                                                               │
                                                 (Paso Único de Modelo Nativo)
                                                               │
                                                               ▼
[Transmisión del Operador] <───(Respuesta de 300-500ms)─────────── [Modelo de Voz a Voz en Tiempo Real]
```

Bajo el capó, aprovechamos un modelo de voz a voz en tiempo real unificado y de última generación.

En lugar de tratar la transcripción de audio, el razonamiento textual y la síntesis de audio como tareas secuenciales, nuestro modelo de voz maneja las tres de manera nativa dentro de una única capa de modelo en un solo pase. No hay un paso de traducción de audio a texto que pierda tono o cadencia, y no hay un paso de síntesis de texto a voz que agregue latencia. Los bytes de audio en bruto fluyen directamente al modelo, y los bytes de audio en streaming salen directamente, comenzando antes de que la respuesta completa esté incluso terminada de calcular.

Al ejecutar nuestra infraestructura de orquestación sin estado en regiones optimizadas cerca de las principales redes de operadores, minimizamos los saltos de red al milisegundo. Eludimos completamente el caos de red inter-servicios. Orbitali actúa estrictamente como un orquestador en tiempo real altamente optimizado, alimentando el contexto del modelo de voz y ejecutando la lógica de negocio del desarrollador sin problemas.

---

## El Compromiso Intencional: Rendimiento sobre Personalización

Sabemos lo que algunos desarrolladores empresariales preguntarán: *"¿Puedo intercambiar el modelo subyacente por mi propio LLM de código abierto ajustado? ¿Puedo conectar un proveedor de voz personalizado que me guste?"*

Nuestra respuesta es directa: **No.** Y esa es una restricción explícita e intencionada, no una omisión.

Deliberadamente cambiamos el intercambio de proveedores a la carta por un agente que realmente se siente como un ser humano vivo al otro lado de la línea. Las plataformas que permiten una personalización total te obligan a gestionar una inmensa complejidad de integración y aceptar la degradación del rendimiento del pipeline de múltiples proveedores.

Al estandarizar en una única arquitectura de modelo altamente eficiente, ofrecemos varias ventajas masivas a los equipos de ingeniería:

* **Simplicidad Operativa:** No necesitas manejar tres claves de suscripción separadas, monitorear el tiempo de actividad a través de múltiples plataformas de infraestructura, o preocuparte de que una actualización de API de síntesis de voz rompa el formato de tu solicitud. Una plataforma lo maneja todo.
* **Transmisión Bidireccional Verdadera y Barge-In:** Debido a que el modelo de voz es nativamente consciente de los parámetros de audio entrantes, maneja las interrupciones naturales del usuario al instante. Si el agente de IA está hablando y un llamante interrumpe con *"Espera, déjame cambiar esa hora,"* Orbitali detecta la transmisión de audio entrante, corta inmediatamente la generación de habla saliente y se re-enfoca en las palabras del cliente. Refleja el comportamiento telefónico humano natural.
* **Precios Transparentes Sin Marcado:** Debido a que no tenemos tres marcas apiladas para pasar, ofrecemos una tarifa de ejecución plana y transparente de **€0.10/minuto** (medido en incrementos precisos de 10 segundos) en todos nuestros planes, tomando de tu asignación mensual base.

---

## Separación Clara de Preocupaciones: Tú Posees la Lógica, Nosotros Ejecutamos el Agente

Mientras restringimos la configuración del modelo para preservar la latencia, proporcionamos flexibilidad absoluta con respecto a tus datos de aplicación. Orbitali mantiene una estricta separación de preocupaciones: tus registros de clientes, reglas personalizadas y datos de backend permanecen completamente dentro de tu infraestructura.

```
┌─────────────────────────────────┐                 ┌───────────────────────────┐
│        RUNTIME DE ORBITALI      │                 │     BACKEND DEL DESARROLLADOR     │
│  - Transmisión de Voz de Baja Latencia  │  agente:tool-call │  - CRMs / APIs de Clientes   │
│  - Modelo de Voz a Voz       │ ────────────────> │  - Reservas / Disponibilidad │
│  - Motor RAG Vector Nativo     │ <──────────────── │  - Lógica Propietaria      │
│                                 │   Respuesta JSON   │                           │
└─────────────────────────────────┘                 └───────────────────────────┘
```

Cuando construyes un agente en Orbitali, puedes aprovechar primitivas avanzadas para desarrolladores a través de webhooks:

### 1. Prompts Dinámicos (Antes de la Llamada)
Las instrucciones estáticas pueden limitar la utilidad de una IA. Con Orbitali, puedes configurar tu agente con un webhook de `Server URL`. En el milisegundo en que una llamada entrante llega a tu línea telefónica, Orbitali envía un ping a tu servidor backend con una carga útil de `agent:assistant-request` que contiene los metadatos del llamante. Tu backend puede buscar instantáneamente ese número en tu CRM y devolver un saludo o cadena de instrucciones completamente dinámico y personalizado:

> *"Hola Alex, bienvenido de nuevo a tu nivel de cuenta Platinum. Veo que tu vuelo se retrasó..."*

### 2. Herramientas API en Vivo (Durante la Conversación)
Los agentes de voz deben ejecutar tareas, no solo conversar. Orbitali admite herramientas de desarrollador personalizadas definidas a través de parámetros simples de JSON Schema. Cuando la conversación desencadena una acción—como reservar una cita en una clínica o verificar el estado de un pedido—Orbitali pausa la generación de audio y publica un evento de webhook `agent:tool-call` a tu servidor. Tu servidor ejecuta la lógica de negocio local, devuelve una carga útil JSON estándar, y el agente continúa hablando sin problemas.

### 3. RAG Nativo Sin Configuración
Si tienes hojas de productos masivas, políticas internas complejas o extensas preguntas frecuentes, no necesitas meterlas en un prompt del sistema o construir una API de búsqueda externa lenta. Puedes subir documentos en Markdown o PDF directamente al panel de control de Orbitali. Nuestra plataforma automáticamente divide y embebe tus datos en una base de datos vectorial de alto rendimiento. Cuando el agente necesita información, ejecuta una herramienta de búsqueda de similitud semántica optimizada (`search_knowledge`) internamente, trayendo respuestas hiper-relevantes sin latencia añadida.

---

## Construido para Constructores: Trae Tu Propio Operador (BYOC)

Orbitali es infraestructura para desarrolladores, equipos de producto y agencias de automatización que desean desplegar bots de voz de grado de producción para flujos de trabajo entrantes como recepción en el mostrador, enrutamiento de intake, triaje de servicio al cliente o líneas de reservas.

Debido a que nos enfocamos exclusivamente en construir la mejor capa de ejecución en tiempo real, **no somos un operador telefónico**. No vendemos números de teléfono, y no aumentamos tus costos de telefonía en un 300%.

Operamos bajo un estricto marco de **Trae Tu Propio Operador (BYOC)**. Conectas tus propias cuentas existentes de Twilio o Telnyx directamente a Orbitali a través de OAuth estándar o webhooks. Mantienes tus precios de operador al por mayor, proteges tu postura de cumplimiento de datos y mantienes la propiedad total sobre tus números de teléfono. Pagas a tu operador directamente por el enrutamiento de líneas, y pagas a Orbitali únicamente por los minutos de ejecución de IA.

*Nota: Orbitali está diseñado y altamente optimizado para flujos de trabajo de manejo de llamadas entrantes. No apoyamos llamadas robóticas masivas salientes, marcadores automáticos de telemarketing o campañas de spam. Esta elección de diseño mantiene nuestra infraestructura libre de tráfico de spam y nos permite enfocarnos en proporcionar un servicio de primer nivel a equipos de desarrollo legítimos.*

---

## Únete a la Beta Pública para Desarrolladores Hoy

La era del incómodo silencio de IA de voz ha terminado. Al abandonar el roto pipeline de múltiples proveedores y diseñar una plataforma en torno a un único modelo de voz a voz unificado en tiempo real, hemos desbloqueado una capacidad de respuesta de calidad humana para aplicaciones de voz.

Nuestra beta pública para desarrolladores está oficialmente en vivo. Cada nueva cuenta recibe **5 minutos de prueba gratis** (válidos por 7 días, sin necesidad de tarjeta de crédito) para probar las mejoras de latencia de primera mano. A partir de ahí, puedes escalar sin problemas a producción a través de nuestros flexibles niveles de suscripción:

| Plan | Precio Base / mes | Minutos Incluidos | Tarifa por Exceso | Mejor Para |
| :--- | :--- | :--- | :--- | :--- |
| **Lanzamiento** | €49 | 300 | €0.10 / min | Validación de MVPs iniciales de clientes |
| **Estudio** | €199 | 1,500 | €0.10 / min | Escalado de producción e informes profundos |
| **Agencia** | €499 | 5,000 | €0.10 / min | Agentes activos ilimitados y líneas concurrentes |

¿Listo para construir un agente de voz que realmente suene humano?

* **Comienza Inmediatamente:** Regístrate y accede al panel en [app.orbitali.ai](https://app.orbitali.ai).
* **Revisa la Arquitectura:** Profundiza en webhooks, prompts dinámicos y esquemas de herramientas a través de nuestra completa documentación para desarrolladores.
* **Conéctate con los Fundadores:** ¿Tienes un requisito de escala altamente personalizado o un despliegue de agencia? Reserva una sesión de descubrimiento de ingeniería directa a través del enlace de calendario de nuestro panel.