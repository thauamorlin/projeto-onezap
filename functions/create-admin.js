/**
 * Script para criar usuário admin via Firebase Admin SDK
 * Usa Application Default Credentials (gcloud auth)
 */

const admin = require('firebase-admin');

// Inicializar com Application Default Credentials
admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'onezap-saas'
});

async function createAdminUser() {
    try {
        console.log('Criando usuário admin...');

        // Criar usuário no Auth
        const user = await admin.auth().createUser({
            email: 'thauamorlin@gmail.com',
            password: 'd4nc&t4ng0',
            displayName: 'Thauã Morlin (Admin)'
        });

        console.log('✅ Usuário criado no Auth:', user.uid);

        // Criar documento no Firestore com acesso vitalício
        await admin.firestore().collection('users').doc(user.uid).set({
            email: 'thauamorlin@gmail.com',
            displayName: 'Thauã Morlin',
            role: 'admin',
            createdAt: new Date().toISOString(),
            subscription: {
                plan: 'business',
                status: 'active',
                isLifetime: true,
                startedAt: new Date().toISOString(),
                expiresAt: null  // Nunca expira
            },
            instanceLimit: 999 // Praticamente ilimitado
        });

        console.log('✅ Dados do usuário criados no Firestore');
        console.log('');
        console.log('========================================');
        console.log('🎉 CONTA ADMIN VITALÍCIA CRIADA!');
        console.log('========================================');
        console.log('Email: thauamorlin@gmail.com');
        console.log('UID:', user.uid);
        console.log('Plano: Business (Vitalício)');
        console.log('Limite: 999 instâncias');
        console.log('========================================');

    } catch (error) {
        if (error.code === 'auth/email-already-exists') {
            console.log('⚠️  Usuário já existe! Atualizando dados...');

            // Buscar usuário existente
            const user = await admin.auth().getUserByEmail('thauamorlin@gmail.com');

            // Atualizar Firestore
            await admin.firestore().collection('users').doc(user.uid).set({
                email: 'thauamorlin@gmail.com',
                displayName: 'Thauã Morlin',
                role: 'admin',
                updatedAt: new Date().toISOString(),
                subscription: {
                    plan: 'business',
                    status: 'active',
                    isLifetime: true,
                    startedAt: new Date().toISOString(),
                    expiresAt: null
                },
                instanceLimit: 999
            }, { merge: true });

            console.log('✅ Dados atualizados para acesso vitalício!');
            console.log('UID:', user.uid);
        } else {
            console.error('❌ Erro:', error.message);
        }
    }

    process.exit();
}

createAdminUser();
