import { Module } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

@Module({
  providers: [
    {
      provide: 'FIREBASE_ADMIN',
      useFactory: async () => {
        if (!admin.apps.length) {
          // Obtener la ruta del archivo JSON desde una variable de entorno
          const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

          if (!serviceAccountPath) {
            throw new Error('La variable de entorno FIREBASE_SERVICE_ACCOUNT_PATH no está definida');
          }

          // Leer el archivo usando la ruta desde la variable de entorno
          const serviceAccountFilePath = path.resolve(serviceAccountPath);

          if (!fs.existsSync(serviceAccountFilePath)) {
            throw new Error(`El archivo de credenciales no existe en la ruta: ${serviceAccountFilePath}`);
          }

          // Leer y parsear el archivo JSON
          const serviceAccountContent = fs.readFileSync(serviceAccountFilePath, 'utf8');
          const serviceAccount = JSON.parse(serviceAccountContent);

          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
        }

        return admin.firestore();
      },
    },
  ],
  exports: ['FIREBASE_ADMIN'],
})
export class FirebaseModule {}
