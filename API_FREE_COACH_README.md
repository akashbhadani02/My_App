# API વગરનું Free English Coach

આ આવૃત્તિમાં `/api/ai-coach` કોઈ OpenAI/Gemini/બીજા AI APIને call કરતું નથી. તે સ્થાનિક JavaScript નિયમો દ્વારા સામાન્ય English ભૂલો સુધારવાનો પ્રયાસ કરે છે. તેથી API key કે AI API billing જરૂરી નથી. તે generative AI જેટલું flexible નથી અને દરેક ભૂલ ઓળખશે તેની ગેરંટી નથી.

## Deploy
1. આ ZIP extract કરો.
2. GitHub repositoryમાં ફાઇલો update કરો (તમારા હાલના Vercel environment variables જેમ કે MongoDB URI અને JWT secret જાળવો).
3. Vercel પર Redeploy કરો.
4. `OPENAI_API_KEY` હવે AI Coach માટે જરૂરી નથી; ઇચ્છો તો Vercelમાંથી તેને કાઢી શકો છો.

સુરક્ષા: મૂળ `.env` ફાઇલ ZIPમાં સામેલ નથી. તેને GitHub પર ક્યારેય અપલોડ ન કરો.
