# Tú controlas la lógica, Orbitali ejecuta el agente: Cómo construir agentes webhook seguros

![Tú controlas la lógica, Orbitali ejecuta el agente: Cómo construir agentes webhook seguros](header.png)

Al integrar IA de voz en software empresarial, los desarrolladores se enfrentan a una decisión arquitectónica crítica: **¿dónde viven los datos del cliente?**

En las plataformas de voz de primera generación, el enfoque estándar es sincronizar todo. Si deseas que tu agente de voz salude a un cliente por su nombre, conozca sus pedidos recientes o acceda a su historial de reservas, debes exportar esos datos a la base de datos propietaria de la plataforma de voz. Debes configurar sus campos de contacto personalizados, establecer sincronizaciones de datos periódicas y replicar tus reglas de negocio dentro de su panel de control.

Para los equipos de SaaS que integran voz (ICP 2) y los Integradores de Sistemas (ICP 3) que construyen para empresas con sistemas heredados, este patrón es inviable. Crea una enorme sobrecarga en la sincronización de datos, aumenta la superficie de ataque y genera dolores de cabeza de cumplimiento (HIPAA, GDPR, SOC 2) al duplicar la Información de Identificación Personal (PII) en entornos de terceros.

En **Orbitali**, creemos en una separación clara de responsabilidades: **Tú eres el dueño de la lógica y de los registros de los clientes; Orbitali ejecuta el runtime del agente sin estado.**

Al aprovechar los agentes de voz basados en Webhooks, puedes construir sistemas conversacionales altamente personalizados y seguros, manteniendo todos los registros sensibles y la lógica de negocio firmemente dentro de tu propia base de datos. Veamos cómo implementar esta arquitectura utilizando los ganchos de ciclo de vida de Orbitali y los eventos de webhook firmados.

---

## El saludo dinámico: `agent:assistant-request`

En lugar de definir de forma estática las instrucciones del sistema o sincronizar los perfiles de los clientes en Orbitali, puedes construir prompts programáticamente en tiempo real a medida que se conecta una llamada.

Cuando se inicia una llamada, Orbitali activa el gancho de ciclo de vida `agent:assistant-request`. Este webhook solicita a tu backend las instrucciones específicas, las variables dinámicas y el saludo personalizado que deben regir la llamada.

Por ejemplo, cuando un usuario marca tu número de teléfono, Orbitali envía el número de teléfono del llamante a tu API. Tu sistema busca el registro, identifica quién está llamando, comprueba si hay eventos próximos (como una cita médica mañana) e inyecta ese contexto directamente en el espacio de memoria del agente.

Así es como manejas esto en un backend de Node.js/Express:

```javascript
const express = require('express');
const app = express();
app.use(express.json());

// Simulación de búsqueda en base de datos
const db = {
  getCustomerByPhone: (phone) => {
    if (phone === '+15550199') {
      return { id: 'cust_982', name: 'Pedro' };
    }
    return null;
  },
  getUpcomingAppointment: (customerId) => {
    if (customerId === 'cust_982') {
      return { date: '2026-07-24T10:00:00Z', type: 'Chequeo clínico' };
    }
    return null;
  }
};

app.post('/webhook/agent-assistant-request', (req, res) => {
  const { caller_id } = req.body;
  
  // 1. Obtener usuario de tu base de datos
  const customer = db.getCustomerByPhone(caller_id);
  
  if (customer) {
    // 2. Obtener contexto (ej. una cita mañana)
    const appointment = db.getUpcomingAppointment(customer.id);
    
    if (appointment) {
      // 3. Inyectar prompt dinámico y saludo personalizado
      return res.json({
        prompt: `Eres un asistente profesional para Clinic Care. Estás hablando con ${customer.name}, quien tiene un ${appointment.type} programado para mañana. Tu objetivo es ayudarle a confirmar, cancelar o reprogramar. Mantén las respuestas amables y concisas.`,
        first_message: `Hola ${customer.name}, ¿llamas para reprogramar tu cita en la clínica de mañana?`
      });
    }
  }

  // Instrucciones de respaldo predeterminadas para llamadas no reconocidas
  return res.json({
    prompt: "Eres un recepcionista profesional para Clinic Care. Pregunta al llamante su nombre y cómo puedes ayudarle.",
    first_message: "Gracias por llamar a Clinic Care. ¿Cómo puedo ayudarte hoy?"
  });
});
```

Con este patrón, Orbitali nunca almacena a "Pedro" ni los registros de su "Chequeo clínico" en sus servidores. El runtime de voz recibe un contexto de prompt temporal durante la llamada, ejecuta el flujo de audio-a-texto-a-audio y lo olvida cuando se envía el evento de colgar.

---

## Acciones seguras: Verificación de firmas HMAC

Un agente de voz no es solo un recepcionista; es un motor transaccional. Un agente que habla con Pedro necesita poder *reprogramar* esa cita. Para hacer esto, el agente utiliza **Llamadas a Herramientas** (o function calling).

Cuando el agente decide invocar una herramienta, Orbitali envía una solicitud POST a la URL de servidor que hayas especificado. Sin embargo, dado que este endpoint puede modificar registros reales de la base de datos (por ejemplo, cambiar las fechas de las citas), debes verificar que las solicitudes entrantes provengan realmente de Orbitali y no de un actor malicioso que simule solicitudes.

Para asegurar esta frontera, Orbitali firma cada carga útil de webhook utilizando una firma HMAC-SHA256, que coincide con una clave secreta que configuras en tu panel de control. Al validar esta firma, garantizas que solo las sesiones de voz autorizadas puedan modificar tu base de datos.

Aquí tienes una implementación estándar de middleware de Express para verificar firmas HMAC:

```javascript
const crypto = require('crypto');

function verifyOrbitaliWebhook(req, res, next) {
  const signatureHeader = req.headers['x-orbitali-signature'];
  const webhookSecret = process.env.ORBITALI_WEBHOOK_SECRET;

  if (!signatureHeader || !webhookSecret) {
    return res.status(401).json({ error: 'No autorizado: Falta la firma o el secreto de firma' });
  }

  // Calcular HMAC SHA256 de la carga útil del cuerpo crudo
  const hmac = crypto.createHmac('sha256', webhookSecret);
  const rawBody = JSON.stringify(req.body);
  const computedSignature = hmac.update(rawBody).digest('hex');

  // Comparación en tiempo seguro para prevenir ataques de sincronización
  const signatureBuffer = Buffer.from(signatureHeader, 'hex');
  const computedBuffer = Buffer.from(computedSignature, 'hex');

  if (signatureBuffer.length !== computedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, computedBuffer)) {
    return res.status(403).json({ error: 'Prohibido: La firma de la solicitud no es válida' });
  }

  next();
}

// Ruta segura para el controlador de herramientas
app.post('/webhook/tools/reschedule-appointment', verifyOrbitaliWebhook, (req, res) => {
  const { appointment_id, new_date } = req.body;
  
  // Actualizar el registro de la base de datos de forma segura
  db.updateAppointment(appointment_id, new_date);
  
  res.json({
    status: 'success',
    message: `Cita reprogramada con éxito para el ${new_date}.`
  });
});
```

Esto garantiza una soberanía absoluta de los datos:
1. **Autenticación dinámica**: Tus endpoints de webhook verán la identidad criptográfica de Orbitali antes de realizar cualquier operación de escritura.
2. **Cero telemetría permanente**: Ninguna API de terceros tiene acceso de escritura a tu base de datos; solo solicitan acciones a través de webhooks seguros.

---

## Por qué esta arquitectura es idónea para equipos de SaaS e integradores

Para los equipos que construyen software robusto, esta clara frontera arquitectónica ofrece tres grandes ventajas:

### Soberanía de cumplimiento y seguridad
Si trabajas en sectores como salud, finanzas o legal, sincronizar PII con un proveedor de voz requiere firmar nuevos Acuerdos de Asociación Comercial (BAAs), auditar sus políticas de cifrado de bases de datos y gestionar complejas solicitudes de eliminación bajo GDPR. Con Orbitali, dado que los perfiles de los clientes nunca se guardan en nuestra base de datos, tu perímetro de cumplimiento permanece completamente intacto.

### Sin sobrecarga de sincronización
La sincronización de datos es conocida por ser frágil. Si un cliente cambia su número de teléfono o programa una cita en tu portal web, sincronizar eso con un panel de control de voz en tiempo real requiere complejos flujos de eventos. Al obtener el contexto de manera dinámica a través de `agent:assistant-request`, tu agente de voz siempre obtiene la única fuente de verdad directamente de tu almacenamiento SQL/NoSQL.

### Desarrollo local ágil
Dado que el agente de voz depende por completo de tus webhooks locales, no necesitas reconstruir ni volver a desplegar la configuración del agente en la nube cuando cambias las reglas de negocio. Puedes usar herramientas como Ngrok o túneles de Cloudflare para redirigir las solicitudes de webhook a tu servidor de desarrollo local, editar tus endpoints de Express y probar inmediatamente cómo se comporta el agente, lo que reduce drásticamente el ciclo de retroalimentación para los desarrolladores.

---

## Resumen: Manteniendo la lógica donde pertenece

La integración de voz empresarial no debería significar comprometer la seguridad o la propiedad de los datos. Con la arquitectura basada en webhooks de Orbitali:
* **Orbitali** actúa como el runtime de streaming en tiempo real de alto rendimiento, gestionando la señalización SIP, flujos WebRTC, TTS de baja latencia y ejecución del LLM.
* **Tu Backend** posee los prompts del sistema, la base de datos de PII y los permisos de escritura transaccionales.

¿Listo para construir un agente webhook seguro? Consulta nuestra documentación para desarrolladores y comienza hoy mismo.
