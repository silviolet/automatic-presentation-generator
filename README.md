# How to Run

## Install Dependencies
1. Install **Git**
2. Install **Python 3.10.6**
3. Install **conda** on PATH (choose *Just Me* during installation to allow PATH setup)
4. Install **ffmpeg** on PATH
5. Install **Node.js** for Next.js (standalone binary recommended)
6. Install **LibreOffice** (update the backend file in case you change the default installation path)

---

## Firebase Setup
1. Create a **Firebase Project**
2. Create a **Web Application**
3. Add **Email** and **Gmail** sign-in providers in the *Get Started* portion of Firebase Authentication
4. Add a file named **`.env.local`** in the main directory with the following populated from the SDK setup and configuration config:

   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
   NEXT_PUBLIC_FIREBASE_APP_ID=
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
   ```

5. Add a file in the **backend directory** named **`.env`** with:

   ```
   OPENAI_API_KEY=
   GMAIL_USER=
   GMAIL_PASS=
   FIREBASE_CREDENTIALS_PATH=
   ```

   - The Gmail fields (`GMAIL_USER`, `GMAIL_PASS`) are for sending emails using a Gmail **application password**  
   - `FIREBASE_CREDENTIALS_PATH` is the path to the Firebase Admin SDK service account key generated under  
     **Project Settings → Firebase Admin SDK → Generate New Private Key**

---

## Project Setup
1. **Git Clone** the project folder
2. **Frontend**:
   ```bash
   npm install
   npm run dev
   ```
3. **Backend**:
   ```bash
   # optional: create virtual env (not required)
   pip install "fastapi[standard]"
   pip install PyMuPDF
   pip install -r requirements.txt
   pip install --upgrade openai
   ```

---

## Local Script Generation
1. Accept the terms for Gemma here: [Gemma 3-4B IT](https://huggingface.co/google/gemma-3-4b-it)  
2. Login to terminal with Hugging Face:
   ```bash
   hf auth login
   ```
3. Install/upgrade transformers:
   ```bash
   pip install --upgrade transformers
   ```

---

## IndexTTS Setup
1. Follow the **conda installation** section of [IndexTTS](https://github.com/index-tts/index-tts)  
   *(IMPORTANT: read the note on the Windows pynini issue)*
2. Update the **IndexTTS directory** in backend source
3. **Ensure your non-conda ffmpeg is first in PATH** and restart after installing

---

## F5-TTS Setup
```bash
pip install f5-tts
```
