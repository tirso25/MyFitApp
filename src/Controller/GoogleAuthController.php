<?php

namespace App\Controller;

use App\Entity\Users;
use App\Service\GoogleAuthService;
use Doctrine\ORM\EntityManagerInterface;
use KnpU\OAuth2ClientBundle\Client\ClientRegistry;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use League\OAuth2\Client\Provider\Exception\IdentityProviderException;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use OpenApi\Attributes as OA;

#[Route('/api/connect')]
class GoogleAuthController extends AbstractController
{
    // URL de tu frontend - CAMBIAR POR TU URL
    private const FRONTEND_URL = 'http://localhost:63341'; // Cambia por tu URL del frontend

    public function __construct(
        private readonly GoogleAuthService $googleAuthService,
        private readonly UserPasswordHasherInterface $passwordHasher,
    ){}

    /**
     * Genera una clave aleatoria compatible con JavaScript
     */
    private function generateRandomKey($length = 32): string
    {
        $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        $result = '';
        $charsLength = strlen($chars);

        for ($i = 0; $i < $length; $i++) {
            $result .= $chars[random_int(0, $charsLength - 1)];
        }

        return $result;
    }

    /**
     * Codifica para URL de manera compatible con JavaScript
     */
    private function encodeForURL($text): string
    {
        return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($text));
    }

    /**
     * Decodifica desde URL de manera compatible con JavaScript
     */
    private function decodeFromURL($encodedText): string
    {
        $base64 = str_replace(['-', '_'], ['+', '/'], $encodedText);

        // Añadir padding necesario
        while (strlen($base64) % 4) {
            $base64 .= '=';
        }

        return base64_decode($base64);
    }

    /**
     * Deriva la clave exactamente como CryptoJS (usando EVP_BytesToKey)
     */
    private function deriveKey($password, $salt): array
    {
        $keyLength = 32; // AES-256
        $ivLength = 16;  // AES block size
        $derivedLength = $keyLength + $ivLength;
        $currentDerived = '';
        $currentBlock = '';

        while (strlen($currentDerived) < $derivedLength) {
            $currentBlock = md5($currentBlock . $password . $salt, true);
            $currentDerived .= $currentBlock;
        }

        return [
            'key' => substr($currentDerived, 0, $keyLength),
            'iv' => substr($currentDerived, $keyLength, $ivLength)
        ];
    }

    /**
     * Encripta un email usando AES-256-CBC (compatible con CryptoJS)
     */
    private function encryptEmail($email, $key): string
    {
        // Generar salt aleatorio de 8 bytes (como CryptoJS)
        $salt = random_bytes(8);

        // Derivar la clave usando el mismo método que CryptoJS
        $keyData = $this->deriveKey($key, $salt);

        // Encriptar usando AES-256-CBC
        $encrypted = openssl_encrypt(
            $email,
            'AES-256-CBC',
            $keyData['key'],
            OPENSSL_RAW_DATA,
            $keyData['iv']
        );

        if ($encrypted === false) {
            throw new \Exception("Encryption failed");
        }

        // Formato CryptoJS: "Salted__" + salt + encrypted
        $result = "Salted__" . $salt . $encrypted;

        return base64_encode($result);
    }

    /**
     * Desencripta un email (compatible con CryptoJS)
     */
    private function decryptEmail($encryptedData, $key): string
    {
        $data = base64_decode($encryptedData);

        if ($data === false) {
            throw new \Exception("Invalid base64 data");
        }

        // Verificar el prefijo "Salted__"
        if (substr($data, 0, 8) !== "Salted__") {
            throw new \Exception("Invalid encrypted data format");
        }

        // Extraer salt y datos encriptados
        $salt = substr($data, 8, 8);
        $encrypted = substr($data, 16);

        // Derivar la clave usando el mismo método que CryptoJS
        $keyData = $this->deriveKey($key, $salt);

        // Desencriptar
        $decrypted = openssl_decrypt(
            $encrypted,
            'AES-256-CBC',
            $keyData['key'],
            OPENSSL_RAW_DATA,
            $keyData['iv']
        );

        if ($decrypted === false) {
            throw new \Exception("Decryption failed");
        }

        return $decrypted;
    }

    /**
     * Encripta y prepara el email para URL
     */
    private function prepareEmailForURL($email): array
    {
        $randomKey = $this->generateRandomKey();
        $encrypted = $this->encryptEmail($email, $randomKey);
        $urlSafeData = $this->encodeForURL($encrypted);
        $urlSafeKey = $this->encodeForURL($randomKey);

        return [
            'email' => $urlSafeData,
            'key' => $urlSafeKey
        ];
    }

    /**
     * Desencripta el email desde parámetros URL
     */
    private function getDecryptedEmailFromURL($emailParam, $keyParam): ?string
    {
        if (!$emailParam || !$keyParam) {
            return null;
        }

        try {
            $decodedData = $this->decodeFromURL($emailParam);
            $decodedKey = $this->decodeFromURL($keyParam);
            return $this->decryptEmail($decodedData, $decodedKey);
        } catch (\Exception $e) {
            error_log('Error al descifrar: ' . $e->getMessage());
            return null;
        }
    }

    #[OA\Get(
        path: '/api/connect/google',
        summary: 'Initiate Google OAuth2 authentication',
        description: 'Redirects user to Google for authentication',
        tags: ['Authentication', 'OAuth2']
    )]
    #[OA\Response(
        response: 302,
        description: 'Redirect to Google OAuth2 authorization URL'
    )]
    #[Route('/google', name: 'connect_google_start')]
    public function connectAction(ClientRegistry $clientRegistry): Response
    {
        // Redirige a Google para autenticación
        return $clientRegistry
            ->getClient('google')
            ->redirect([
                'email', 'profile'
            ]);
    }

    #[OA\Get(
        path: '/api/connect/google/check',
        summary: 'Google OAuth2 callback',
        description: 'Handles Google OAuth2 callback and creates/authenticates user',
        tags: ['Authentication', 'OAuth2']
    )]
    #[OA\Response(
        response: 200,
        description: 'Successful authentication',
        content: new OA\JsonContent(
            type: 'object',
            properties: [
                new OA\Property(property: 'type', type: 'string', example: 'success'),
                new OA\Property(property: 'message', type: 'string', example: 'Login successful'),
                new OA\Property(
                    property: 'user',
                    type: 'object',
                    properties: [
                        new OA\Property(property: 'id', type: 'integer', example: 1),
                        new OA\Property(property: 'email', type: 'string', example: 'user@gmail.com'),
                        new OA\Property(property: 'username', type: 'string', example: 'johndoe')
                    ]
                )
            ]
        )
    )]
    #[Route('/google/check', name: 'connect_google_check')]
    public function connectCheckAction(Request $request, ClientRegistry $clientRegistry, EntityManagerInterface $entityManager): Response
    {
        try {
            $client = $clientRegistry->getClient('google');

            // Obtener el token de acceso
            $accessToken = $client->getAccessToken();

            // Obtener información del usuario desde Google
            $googleUser = $client->fetchUserFromToken($accessToken);

            $email = $googleUser->getEmail();
            $name = $googleUser->getName();
            $googleId = $googleUser->getId();

            // Verificar si el usuario ya existe
            $userRepository = $entityManager->getRepository(Users::class);
            $existingUser = $userRepository->findOneBy(['email' => $email]);

            if ($existingUser) {
                // Usuario existe, actualizar Google ID si no lo tiene
                if (!$existingUser->getGoogleId()) {
                    $existingUser->setGoogleId($googleId);
                    $entityManager->flush();
                }

                // Encriptar el email para la URL
                $encryptedData = $this->prepareEmailForURL($existingUser->getEmail());

                // Redirigir con indicador de éxito
                return $this->redirect(self::FRONTEND_URL . '/MyFitApp/FRONT/TEST/checkGoogle.html?' . http_build_query([
                        'email' => $encryptedData['email'],
                        'key' => $encryptedData['key'],
                        'type' => 'success',
                        'message' => 'Login successful'
                    ]));
            } else {
                // Crear nuevo usuario
                $newUser = new Users();
                $newUser->setEmail($email);
                $newUser->setUsername($this->googleAuthService->generateUsername($name, $entityManager));
                $newUser->setGoogleId($googleId);
                $newUser->setStatus('active');
                $newUser->setDateUnion(new \DateTime());
                $randomPassword = $this->googleAuthService->generateRandomPassword();
                $hashedPassword = $this->passwordHasher->hashPassword($newUser, $randomPassword);
                $newUser->setPassword($hashedPassword);

                $entityManager->persist($newUser);
                $entityManager->flush();

                // Encriptar el email para la URL
                $encryptedData = $this->prepareEmailForURL($newUser->getEmail());

                // Redirigir con indicador de éxito
                return $this->redirect(self::FRONTEND_URL . '/MyFitApp/FRONT/TEST/sendEmail.html?' . http_build_query([
                        'email' => $encryptedData['email'],
                        'key' => $encryptedData['key'],
                        'type' => 'changePassword',
                        'message' => 'User successfully created'
                    ]));
            }

        } catch (IdentityProviderException $e) {
            // Redirigir con indicador de error
            return $this->redirect(self::FRONTEND_URL . '/MyFitApp/FRONT/TEST/checkGoogle.html?' . http_build_query([
                    'type' => 'error',
                    'message' => 'Failed to authenticate with Google'
                ]));
        } catch (\Exception $e) {
            // Redirigir con indicador de error
            return $this->redirect(self::FRONTEND_URL . '/MyFitApp/FRONT/TEST/checkGoogle.html?' . http_build_query([
                    'type' => 'error',
                    'message' => 'An error occurred during Google authentication'
                ]));
        }
    }
}
