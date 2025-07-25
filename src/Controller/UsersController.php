<?php

namespace App\Controller;

use App\Entity\Users;
use App\Service\GlobalService;
use App\Service\UserService;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Encoder\JWTEncoderInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[Route('/api/users')]
class UsersController extends AbstractController
{
    public function __construct(
        private readonly UserService $userService,
        private readonly GlobalService $globalService,
    ){}

    #[OA\Post(
        path: '/api/users/signUp',
        summary: 'User Registration',
        description: 'Register a new user account. The user will be created with pending status and requires activation.',
        tags: ['Users', 'Authentication']
    )]
    #[OA\RequestBody(
        required: true,
        description: 'User registration data',
        content: new OA\JsonContent(
            type: 'object',
            required: ['email', 'username', 'password', 'repeatPassword'],
            properties: [
                new OA\Property(
                    property: 'email',
                    type: 'string',
                    format: 'email',
                    description: 'User email address (max 255 characters)',
                    example: 'user@example.com'
                ),
                new OA\Property(
                    property: 'username',
                    type: 'string',
                    description: 'Username (5-20 characters, lowercase letters and numbers only)',
                    pattern: '^[a-z0-9]{5,20}$',
                    example: 'username123'
                ),
                new OA\Property(
                    property: 'password',
                    type: 'string',
                    format: 'password',
                    description: 'Password (5-255 characters, must contain: uppercase, lowercase, digit, special character)',
                    pattern: '^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{5,255}$',
                    example: 'MyPass123!'
                ),
                new OA\Property(
                    property: 'repeatPassword',
                    type: 'string',
                    format: 'password',
                    description: 'Password confirmation (must match password)',
                    example: 'MyPass123!'
                )
            ]
        )
    )]
    #[OA\Response(
        response: 201,
        description: 'User successfully created',
        content: new OA\JsonContent(
            type: 'object',
            properties: [
                new OA\Property(property: 'type', type: 'string', example: 'success'),
                new OA\Property(property: 'message', type: 'string', example: 'User successfully created')
            ]
        )
    )]
    #[OA\Response(
        response: 400,
        description: 'Bad Request - Invalid input data or validation errors',
        content: new OA\JsonContent(
            type: 'object',
            properties: [
                new OA\Property(property: 'type', type: 'string', example: 'error'),
                new OA\Property(
                    property: 'message',
                    type: 'string',
                    enum: [
                        'Invalid data',
                        'Invalid email format',
                        'Invalid password format',
                        'Invalid username format',
                        'Passwords dont match'
                    ],
                    example: 'Invalid data'
                )
            ]
        )
    )]
    #[OA\Response(
        response: 404,
        description: 'User already exists with provided email or username',
        content: new OA\JsonContent(
            type: 'object',
            properties: [
                new OA\Property(property: 'type', type: 'string', example: 'error'),
                new OA\Property(property: 'message', type: 'string', example: 'User already exists')
            ]
        )
    )]
    #[OA\Response(
        response: 500,
        description: 'Internal Server Error - Unexpected error during registration',
        content: new OA\JsonContent(
            type: 'object',
            properties: [
                new OA\Property(property: 'type', type: 'string', example: 'error'),
                new OA\Property(property: 'message', type: 'string', example: 'An error occurred while singUp the user')
            ]
        )
    )]
    #[Route('/signUp', name: 'api_signUp', methods: ['POST'])]
    public function signUp(EntityManagerInterface $entityManager, Request $request): JsonResponse
    {
        try {
            $data = json_decode($request->getContent(), true);

            $email = $this->globalService->validate(strtolower($data['email'] ?? ""));
            $username = $this->globalService->validate(strtolower($data['username'] ?? ""));
            $password = $data['password'] ?? "";
            $repeatPassword = $data['repeatPassword'] ?? "";

            $password_regex = "/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{5,255}$/";
            $username_regex = "/^[a-z0-9]{5,20}$/";

            if ($email === "" || $username === "" || $password === "" || $repeatPassword === "") {
                return $this->json(['type' => 'error', 'message' => 'Invalid data'], Response::HTTP_BAD_REQUEST);
            }

            if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 255) {
                return $this->json(['type' => 'error', 'message' => 'Invalid email format'], Response::HTTP_BAD_REQUEST);
            }

            if (!preg_match($password_regex, $password) || !preg_match($password_regex, $repeatPassword)) {
                return $this->json(['type' => 'error', 'message' => 'Invalid password format'], Response::HTTP_BAD_REQUEST);
            }

            if (!preg_match($username_regex, $username)) {
                return $this->json(['type' => 'error', 'message' => 'Invalid username format'], Response::HTTP_BAD_REQUEST);
            }

            if ($this->userService->userExisting3($email, $username, $entityManager)) {
                return $this->json(['type' => 'error', 'message' => 'User already exists'], Response::HTTP_NOT_FOUND);
            }

            if ($password !== $repeatPassword) {
                return $this->json(['type' => 'error', 'message' => 'Passwords dont match'], Response::HTTP_BAD_REQUEST);
            }

            $newUser = new Users();

            $newUser->setEmail($email);
            $newUser->setUsername($username);
            $newUser->setPassword($this->userService->hashPassword($password));
            $newUser->setStatus('pending');
            $newUser->setDateUnion(new \DateTime());


            $entityManager->persist($newUser);
            $entityManager->flush();

            return $this->json(['type' => 'success', 'message' => 'User successfully created'], Response::HTTP_CREATED);
        } catch (\Exception $e) {
            return $this->json(['type' => 'error', 'message' => 'An error occurred while signUp the user'], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    #[OA\Post(
        path: '/api/users/signIn',
        summary: 'User Authentication',
        description: 'Authenticate a user and start a session. Returns a JWT token and user data. Supports remember me functionality.',
        tags: ['Users', 'Authentication']
    )]
    #[OA\RequestBody(
        required: true,
        description: 'User authentication credentials',
        content: new OA\JsonContent(
            type: 'object',
            required: ['email', 'password', 'rememberme'],
            properties: [
                new OA\Property(
                    property: 'email',
                    type: 'string',
                    description: 'User email address or username. Email format for email (max 255 characters) or username format (4-20 characters, lowercase letters and numbers only)',
                    oneOf: [
                        new OA\Schema(type: 'string', format: 'email', example: 'user@example.com'),
                        new OA\Schema(type: 'string', pattern: '^[a-z0-9]{4,20}$', example: 'username123')
                    ]
                ),
                new OA\Property(
                    property: 'password',
                    type: 'string',
                    format: 'password',
                    description: 'User password (5-255 characters, must contain: uppercase, lowercase, digit, special character)',
                    pattern: '^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{5,255}$',
                    example: 'MyPass123!'
                ),
                new OA\Property(
                    property: 'rememberme',
                    type: 'boolean',
                    description: 'Whether to create a persistent session (30 days) or session-only token',
                    example: true
                )
            ]
        )
    )]
    #[OA\Response(
        response: 200,
        description: 'User successfully authenticated',
        content: new OA\JsonContent(
            type: 'object',
            properties: [
                new OA\Property(property: 'type', type: 'string', example: 'success'),
                new OA\Property(property: 'message', type: 'string', example: 'Session successfully started'),
                new OA\Property(property: 'token', type: 'string', description: 'JWT authentication token', example: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...'),
                new OA\Property(
                    property: 'userData',
                    type: 'object',
                    description: 'User information',
                    properties: [
                        new OA\Property(property: 'this_user_id', type: 'integer', example: 123),
                        new OA\Property(property: 'this_user_email', type: 'string', example: 'user@example.com'),
                        new OA\Property(property: 'this_user_username', type: 'string', example: 'username123'),
                        new OA\Property(property: 'this_user_date_union', type: 'string', format: 'date-time', example: '2024-01-15T10:30:00+00:00')
                    ]
                ),
                new OA\Property(
                    property: 'rememberToken',
                    type: 'string',
                    description: 'Remember token (only present when rememberme is true)',
                    example: 'a1b2c3d4e5f6...'
                )
            ]
        )
    )]
    #[OA\Response(
        response: 400,
        description: 'Bad Request - Invalid input data, validation errors, or wrong credentials',
        content: new OA\JsonContent(
            type: 'object',
            properties: [
                new OA\Property(property: 'type', type: 'string', example: 'error'),
                new OA\Property(
                    property: 'message',
                    type: 'string',
                    enum: [
                        'Invalid data',
                        'Invalid email format',
                        'Invalid username format',
                        'Invalid password format',
                        'User or password doesnt match'
                    ],
                    example: 'Invalid data'
                )
            ]
        )
    )]
    #[OA\Response(
        response: 404,
        description: 'User not found or deleted',
        content: new OA\JsonContent(
            type: 'object',
            properties: [
                new OA\Property(property: 'type', type: 'string', example: 'error'),
                new OA\Property(property: 'message', type: 'string', example: 'The user does not exist')
            ]
        )
    )]
    #[OA\Response(
        response: 409,
        description: 'Conflict - User account is pending activation',
        content: new OA\JsonContent(
            type: 'object',
            properties: [
                new OA\Property(property: 'type', type: 'string', example: 'warning'),
                new OA\Property(property: 'message', type: 'string', example: 'This user is pending activation')
            ]
        )
    )]
    #[OA\Response(
        response: 500,
        description: 'Internal Server Error - Unexpected error during authentication',
        content: new OA\JsonContent(
            type: 'object',
            properties: [
                new OA\Property(property: 'type', type: 'string', example: 'error'),
                new OA\Property(property: 'message', type: 'string', example: 'Error interno al hacer signIn: Database connection failed')
            ]
        )
    )]
    #[Route('/signIn', name: 'api_signIn', methods: ['POST'])]
    public function signIn(EntityManagerInterface $entityManager, Request $request, JWTTokenManagerInterface $jwtManager, JWTEncoderInterface $jwtEncoder): JsonResponse
    {
        try {
            $data = json_decode($request->getContent(), true);

            $email = $this->globalService->validate(strtolower($data['email'] ?? ""));
            $password = $this->globalService->validate($data['password'] ?? "");
            $rememberme = isset($data['rememberme']) ? filter_var($data['rememberme'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) : null;

            $password_regex = "/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{5,255}$/";
            $username_regex = "/^[a-z0-9]{4,20}$/";

            if ($email === "" || $password === "" || $rememberme === null) {
                return $this->json(['type' => 'error', 'message' => 'Invalid data'], Response::HTTP_BAD_REQUEST);
            }

            if (str_contains($email, '@')) {
                if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 255) {
                    return $this->json(['type' => 'error', 'message' => 'Invalid email format'], Response::HTTP_BAD_REQUEST);
                }
            } else {
                if (!preg_match($username_regex, $email)) {
                    return $this->json(['type' => 'error', 'message' => 'Invalid username format'], Response::HTTP_BAD_REQUEST);
                }
            }

            if (!preg_match($password_regex, $password)) {
                return $this->json(['type' => 'error', 'message' => 'Invalid password format'], Response::HTTP_BAD_REQUEST);
            }

            $user = $this->userService->userExisting($email, $entityManager);

            if (!$user) {
                return $this->json(['type' => 'error', 'message' => 'The user does not exist'], Response::HTTP_NOT_FOUND);
            }

            $state_user = $user->getStatus();
            $id_user = $user->getUserId();

            switch ($state_user) {
                case "pending":
                    return $this->json(['type' => 'warning', 'message' => 'This user is pending activation'], Response::HTTP_CONFLICT);
                case "deleted":
                    return $this->json(['type' => 'error', 'message' => 'The user does not exist'], Response::HTTP_NOT_FOUND);
            }

            $hashedPassword = $user->getPassword();
            $passwordVerify = password_verify($password, $hashedPassword) || $password === $hashedPassword;

            if (!$passwordVerify) {
                return $this->json(['type' => 'error', 'message' => 'User or password doesnt match'], Response::HTTP_BAD_REQUEST);
            }

            $rememberToken = null;

            if ($rememberme === true) {
                $payload = [
                    'username' => $user->getUserIdentifier(),
                    'roles' => $user->getRoles(),
                    'exp' => time() + (3600 * 24 * 30),
                ];

                $jwtToken = $jwtEncoder->encode($payload);

                $rememberToken = bin2hex(random_bytes(32));

                $cookieExpire = time() + (3600 * 24 * 30);
                setcookie(
                    "rememberToken",
                    $rememberToken,
                    [
                        'expires' => $cookieExpire,
                        'path' => '/',
                        'secure' => true,
                        'httponly' => true,
                        'samesite' => 'None'
                    ]
                );

                $user->setToken($rememberToken);
            } elseif (!$rememberme) {
                $jwtToken = $jwtManager->create($user);

                $this->userService->removeToken($entityManager, $id_user);

                if (isset($_COOKIE['rememberToken'])) {
                    setcookie("rememberToken", "", [
                        'expires' => time() - 3600,
                        'path' => '/',
                        'secure' => false,
                        'httponly' => false,
                        'samesite' => 'Strict'
                    ]);

                    unset($_COOKIE['rememberToken']);
                }
            }

            $userData = [
                'this_user_id' => $user->getUserId(),
                'this_user_email' =>  $user->getEmail(),
                'this_user_username' => $user->getDisplayUsername(),
                'this_user_date_union' => $user->getDateUnion()
            ];

            $entityManager->persist($user);
            $entityManager->flush();

            $response = [
                'type' => 'success',
                'message' => 'Session successfully started',
                'token' => $jwtToken,
                'userData' => $userData
            ];

            if ($rememberme === true && $rememberToken) {
                $response['rememberToken'] = $rememberToken;
            }

            return $this->json($response, Response::HTTP_OK);
        } catch (\Exception $e) {
            return $this->json([
                'type' => 'error',
                'message' => 'Internal error when making signIn: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    #[OA\Post(
        path: '/api/users/signOut',
        summary: 'User Logout',
        description: 'End the current user session and invalidate authentication tokens. Requires valid JWT token in Authorization header.',
        tags: ['Users', 'Authentication'],
        security: [['bearerAuth' => []]]
    )]
    #[OA\RequestBody(
        required: false,
        description: 'No request body required for logout'
    )]
    #[OA\Response(
        response: 200,
        description: 'Session successfully ended',
        content: new OA\JsonContent(
            type: 'object',
            properties: [
                new OA\Property(property: 'type', type: 'string', example: 'success'),
                new OA\Property(property: 'message', type: 'string', example: 'Session successfully ended')
            ]
        )
    )]
    #[OA\Response(
        response: 401,
        description: 'Unauthorized - User not logged in or not active',
        content: new OA\JsonContent(
            type: 'object',
            properties: [
                new OA\Property(property: 'type', type: 'string', example: 'error'),
                new OA\Property(
                    property: 'message',
                    type: 'string',
                    enum: [
                        'You are not logged in',
                        'You are not active'
                    ],
                    example: 'You are not logged in'
                )
            ]
        )
    )]
    #[OA\Parameter(
        name: 'Authorization',
        description: 'Bearer JWT token for authentication',
        in: 'header',
        required: true,
        schema: new OA\Schema(
            type: 'string',
            example: 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...'
        )
    )]
    #[Route('/signOut', name: 'api_signOut', methods: ['POST'])]
    public function signOut(EntityManagerInterface $entityManager,Security $security): JsonResponse
    {
        $state = $this->globalService->checkState($entityManager, $security);

        if ($state['response'] !== null) {
            return $state['response'];
        }

        /** @var Users $thisUser */
        $thisUser = $state['user'];
        $thisUserId = $thisUser->getUserId();

        $this->globalService->forceSignOut($entityManager, $thisUserId);

        return $this->json(['type' => 'success', 'message' => 'Session successfully ended'], Response::HTTP_OK);
    }


    #[OA\Post(
        path: '/api/users/tokenExisting',
        summary: 'Validate Remember Token',
        description: 'Check if a remember token cookie exists and is valid. Used for automatic login when "remember me" was selected. Returns user data if token is valid.',
        tags: ['Users', 'Authentication']
    )]
    #[OA\RequestBody(
        required: false,
        description: 'No request body required. The remember token is read from cookies.'
    )]
    #[OA\Parameter(
        name: 'rememberToken',
        description: 'Remember token cookie set during login with remember me option',
        in: 'cookie',
        required: false,
        schema: new OA\Schema(
            type: 'string',
            example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'
        )
    )]
    #[OA\Response(
        response: 200,
        description: 'Valid token found - User automatically authenticated',
        content: new OA\JsonContent(
            type: 'object',
            properties: [
                new OA\Property(property: 'type', type: 'string', example: 'success'),
                new OA\Property(property: 'message', type: 'string', example: 'Welcome back username123!!!'),
                new OA\Property(
                    property: 'userData',
                    type: 'object',
                    description: 'User information for automatic login',
                    properties: [
                        new OA\Property(property: 'this_user_id', type: 'integer', example: 123),
                        new OA\Property(property: 'this_user_email', type: 'string', example: 'user@example.com'),
                        new OA\Property(property: 'this_user_username', type: 'string', example: 'username123'),
                        new OA\Property(property: 'this_user_role_id', type: 'integer', example: 4),
                        new OA\Property(property: 'this_user_role', type: 'string', example: 'user'),
                        new OA\Property(property: 'this_user_date_union', type: 'string', format: 'date-time', example: '2024-01-15T10:30:00+00:00')
                    ]
                )
            ]
        )
    )]
    #[OA\Response(
        response: 204,
        description: 'No remember token found in cookies - No content to return'
    )]
    #[OA\Response(
        response: 401,
        description: 'Invalid or expired token - Token not found in database',
        content: new OA\JsonContent(
            type: 'object',
            properties: [
                new OA\Property(property: 'type', type: 'string', example: 'error'),
                new OA\Property(property: 'message', type: 'string', example: 'Invalid or expired token')
            ]
        )
    )]
    #[OA\Response(
        response: 403,
        description: 'Account not active - User exists but account is not active',
        content: new OA\JsonContent(
            type: 'object',
            properties: [
                new OA\Property(property: 'type', type: 'string', example: 'error'),
                new OA\Property(property: 'message', type: 'string', example: 'Account not active')
            ]
        )
    )]
    #[OA\Response(
        response: 500,
        description: 'Internal Server Error - Unexpected error during token validation',
        content: new OA\JsonContent(
            type: 'object',
            properties: [
                new OA\Property(property: 'type', type: 'string', example: 'error'),
                new OA\Property(property: 'message', type: 'string', example: 'Error checking token')
            ]
        )
    )]
    #[Route('/tokenExisting', name: 'app_tokenExisting', methods: ['POST'])]
    public function tokenExisting(EntityManagerInterface $entityManager, Request $request): JsonResponse
    {
        try {
            $token = $request->cookies->get('rememberToken');

            if (!$token) {
                return $this->json(['type' => 'info', 'message' => 'No remember token found']);
            }

            $user = $entityManager->getRepository(Users::class)->findOneBy(['token' => $token]);

            if (!$user) {

                setcookie("rememberToken", "", [
                    'expires' => time() - 3600,
                    'path' => '/',
                    'secure' => false,
                    'httponly' => false,
                    'samesite' => 'Strict'
                ]);

                return $this->json([
                    'type' => 'error',
                    'message' => 'Invalid or expired token'
                ], Response::HTTP_UNAUTHORIZED);
            }

            if ($user->getStatus() !== 'active') {
                return $this->json([
                    'type' => 'error',
                    'message' => 'Account not active'
                ], Response::HTTP_FORBIDDEN);
            }

            $username = $user->getDisplayUsername();

            return $this->json([
                'type' => 'success',
                'message' => "Welcome back $username!!!",
                'userData' => [
                    'this_user_id' => $user->getUserId(),
                    'this_user_email' => $user->getEmail(),
                    'this_user_username' => $user->getDisplayUsername(),
                    'this_user_role_id' => $user->getRole()->getRoleId(),
                    'this_user_role' => $user->getRole()->getName(),
                    'this_user_date_union' => $user->getDateUnion()
                ]
            ]);
        } catch (\Exception $e) {
            return $this->json([
                'type' => 'error',
                'message' => 'Error checking token'
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    #[OA\Get(
        path: '/api/users/whoami',
        summary: 'Get Current User Information',
        description: 'Retrieve information about the currently authenticated user. This endpoint requires JWT authentication and the user must be active.',
        tags: ['Users', 'Authentication']
    )]
    #[OA\Parameter(
        name: 'Authorization',
        in: 'header',
        required: true,
        description: 'JWT Bearer token for authentication',
        schema: new OA\Schema(type: 'string', example: 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...')
    )]
    #[OA\Response(
        response: 200,
        description: 'Successful retrieval of current user information',
        content: new OA\JsonContent(
            type: 'object',
            properties: [
                new OA\Property(property: 'ID', type: 'integer', description: 'Unique user identifier', example: 1),
                new OA\Property(property: 'USERNAME', type: 'string', description: 'User display name', example: 'username123'),
                new OA\Property(property: 'ROLE', type: 'string', description: 'User role name', example: 'ROLE_USER')
            ]
        )
    )]
    #[OA\Response(
        response: 401,
        description: 'Unauthorized - User authentication required or user not active',
        content: new OA\JsonContent(
            type: 'object',
            properties: [
                new OA\Property(property: 'type', type: 'string', example: 'error'),
                new OA\Property(
                    property: 'message',
                    type: 'string',
                    enum: [
                        'You are not logged in',
                        'You are not active'
                    ],
                    example: 'You are not logged in'
                )
            ]
        )
    )]
    #[Route('/whoami', name: 'api_whoami', methods: ['GET'])]
    public function whoami(EntityManagerInterface $entityManager, Security $security): JsonResponse
    {
        $state = $this->globalService->checkState($entityManager, $security);

        if ($state['response'] !== null) {
            return $state['response'];
        }

        /** @var Users $thisUser */
        $thisUser = $state['user'];

        return $this->json([
            'ID' => $thisUser->getUserId(),
            'USERNAME' => $thisUser->getDisplayUsername(),
        ]);
    }

    #[OA\Post(
        path: '/api/users/sendEmail',
        summary: 'Send Verification Email',
        description: 'Send a verification email with a 6-digit code to a user with pending status. This endpoint does not require authentication and is used for user activation process.',
        tags: ['Users', 'Email', 'Verification']
    )]
    #[OA\RequestBody(
        required: true,
        description: 'Email address to send verification code to',
        content: new OA\JsonContent(
            type: 'object',
            required: ['email'],
            properties: [
                new OA\Property(
                    property: 'email',
                    type: 'string',
                    format: 'email',
                    description: 'User email address',
                    example: 'user@example.com'
                )
            ]
        )
    )]
    #[OA\Response(
        response: 200,
        description: 'Email sent successfully',
        content: new OA\JsonContent(
            type: 'object',
            properties: [
                new OA\Property(property: 'type', type: 'string', example: 'success'),
                new OA\Property(property: 'message', type: 'string', example: 'Email sent successfully')
            ]
        )
    )]
    #[OA\Response(
        response: 400,
        description: 'Bad Request - Invalid data or email format',
        content: new OA\JsonContent(
            type: 'object',
            properties: [
                new OA\Property(property: 'type', type: 'string', example: 'error'),
                new OA\Property(
                    property: 'message',
                    type: 'string',
                    enum: [
                        'Invalid data',
                        'Invalid email format'
                    ],
                    example: 'Invalid email format'
                )
            ]
        )
    )]
    #[OA\Response(
        response: 404,
        description: 'Not Found - User with the provided email does not exist',
        content: new OA\JsonContent(
            type: 'object',
            properties: [
                new OA\Property(property: 'type', type: 'string', example: 'error'),
                new OA\Property(property: 'message', type: 'string', example: 'The user does not exist')
            ]
        )
    )]
    #[OA\Response(
        response: 409,
        description: 'Conflict - User is already active',
        content: new OA\JsonContent(
            type: 'object',
            properties: [
                new OA\Property(property: 'type', type: 'string', example: 'error'),
                new OA\Property(property: 'message', type: 'string', example: 'The user is already active')
            ]
        )
    )]
    #[OA\Response(
        response: 500,
        description: 'Internal Server Error - Email sending failed or other server error',
        content: new OA\JsonContent(
            type: 'object',
            properties: [
                new OA\Property(property: 'type', type: 'string', example: 'error'),
                new OA\Property(property: 'message', type: 'string', example: 'Connection could not be established with host "smtp.gmail.com"')
            ]
        )
    )]
    #[Route('/sendEmail', name: 'api_activeUser', methods: ['POST'])]
    public function sendEmail(EntityManagerInterface $entityManager, MailerInterface $mailer, Request $request): JsonResponse
    {
        try {
            $data = json_decode($request->getContent(), true);

            $email = $this->globalService->validate(strtolower($data['email'] ?? ""));
            $type = $this->globalService->validate($data['type']) ?? "";

            if ($email === ""  || $type === "") {
                return $this->json(['type' => 'error', 'message' => 'Invalid data'], Response::HTTP_BAD_REQUEST);
            }

            if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 255) {
                return $this->json(['type' => 'error', 'message' => 'Invalid email format'], Response::HTTP_BAD_REQUEST);
            }

            if(!in_array($type, ["activateAccount", "changePassword"])){
                return $this->json(['type' => 'error', 'message' => 'Invalid type'], Response::HTTP_BAD_REQUEST);
            }

            $user = $entityManager->getRepository(Users::class)->findOneBy(['email' => $email]);

            if (!$user) {
                return $this->json(['type' => 'error', 'message' => 'The user does not exist'], Response::HTTP_NOT_FOUND);
            }

            if($type === "activateAccount"){
                if ($user->getStatus() !== "pending") {
                    return $this->json(['type' => 'error', 'message' => 'The user is already active'], Response::HTTP_CONFLICT);
                }
            }

            $verificationCode = $this->userService->generateCode();

            $user->setVerificationCode($verificationCode);

            $url = $subject = $htmlContent = "";

            switch ($type) {
                case "activateAccount":
                    $url = "http://localhost:63341/MyFitApp/FRONT/TEST/checkCode.html?checkCode=" . $verificationCode;
                    $subject = "Welcome to MyFitApp";
                    $htmlContent = '<html lang="es">
                    <body style="font-family: Arial, sans-serif; background-color: #f0fff0; margin: 0; padding: 0;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
                            <tr>
                                <td>
                                    <h1 style="color: #2e7d32; text-align: center;">Welcome to MyFitApp!</h1>
                                    <p style="color: #333333; font-size: 16px; text-align: center;">
                                        Thank you for registering with <strong>MyFitApp</strong>.<br />
                                        We are delighted to have you join our community.
                                    </p>
                                    <p style="color: #333333; font-size: 16px; text-align: center;">
                                        Here is your verification code:
                                    </p>
                                    <h2 style="color: #4caf50; text-align: center;">' . $verificationCode . '</h2>
                                    <p style="color: #333333; font-size: 16px; text-align: center;">
                                        Enjoy the app and reach your goals in a smarter way! 💪
                                    </p>
                                    <div style="text-align: center; margin-top: 30px;">
                                        <a href="' . $url . '" style="background-color: #4caf50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                                            Go to MyFitApp
                                        </a>
                                    </div>
                                    <p style="text-align: center; color: #999999; font-size: 12px; margin-top: 30px;">
                                        &copy; ' . date("Y") . ' MyFitApp. All rights reserved.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </body>
                </html>';
                    break;
                case "changePassword":
                    $url = "http://localhost:63341/MyFitApp/FRONT/TEST/changePassword.html?checkCode=" . $verificationCode;
                    $subject = "Change Password MyFitApp";
                    $htmlContent = '<html lang="es">
                    <body style="font-family: Arial, sans-serif; background-color: #f0fff0; margin: 0; padding: 0;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
                            <tr>
                                <td>
                                    <h1 style="color: #2e7d32; text-align: center;">Change Password MyFitApp</h1>
                                    <p style="color: #333333; font-size: 16px; text-align: center;">
                                        Here is your verification code:
                                    </p>
                                    <h2 style="color: #4caf50; text-align: center;">' . $verificationCode . '</h2>
                                    <p style="color: #333333; font-size: 16px; text-align: center;">
                                        Enjoy the app and reach your goals in a smarter way! 💪
                                    </p>
                                    <div style="text-align: center; margin-top: 30px;">
                                        <a href="' . $url . '" style="background-color: #4caf50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                                            Go to MyFitApp
                                        </a>
                                    </div>
                                    <p style="text-align: center; color: #999999; font-size: 12px; margin-top: 30px;">
                                        &copy; ' . date("Y") . ' MyFitApp. All rights reserved.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </body>
                </html>';
                    break;
            }

            $entityManager->flush();

            $sendEmail = (new Email())
                ->from('fittracktfg@gmail.com')
                ->to($email)
                ->subject($subject)
                ->html($htmlContent);

            $mailer->send($sendEmail);

            return $this->json(['type' => 'success', 'message' => 'Email sent successfully'], Response::HTTP_OK);
        } catch (\Exception $e) {
            return $this->json(['type' => 'error', 'message' => $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    #[Route('/changePassword', name: 'api_changePassword', methods: ['PUT'])]
    public function changePassword(EntityManagerInterface $entityManager, Request $request): JsonResponse
    {
        try {
            $data = json_decode($request->getContent(), true);

            $verificationCode = (int)$this->globalService->validate($data['verificationCode']) ?? "";
            $password = $data['password'] ?? "";
            $repeatPassword = $data['repeatPassword'] ?? "";

            $password_regex = "/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{5,255}$/";

            if ($verificationCode === "" || $password === "" || $repeatPassword === "") {
                return $this->json(['type' => 'error', 'message' => 'Invalid data'], Response::HTTP_BAD_REQUEST);
            }

            if ($verificationCode > 999999 || $verificationCode < 100000) {
                return $this->json(['type' => 'error', 'message' => 'Invalid verification code format'], Response::HTTP_BAD_REQUEST);
            }

            if (!preg_match($password_regex, $password) || !preg_match($password_regex, $repeatPassword)) {
                return $this->json(['type' => 'error', 'message' => 'Invalid password format'], Response::HTTP_BAD_REQUEST);
            }

            if ($password !== $repeatPassword) {
                return $this->json(['type' => 'error', 'message' => 'Passwords dont match'], Response::HTTP_BAD_REQUEST);
            }

            $user = $entityManager->getRepository(Users::class)->findOneBy(['verification_code' => $verificationCode]);

            if (!$user) {
                return $this->json(['type' => 'error', 'message' => 'Invalid verification code'], Response::HTTP_NOT_FOUND);
            }

            $user->setPassword($this->userService->hashPassword($password));
            $user->setVerificationCode(null);

            $entityManager->flush();

            return $this->json(['type' => 'success', 'message' => 'Password successfully updated'], Response::HTTP_CREATED);
        } catch (\Exception $e) {
            return $this->json(['type' => 'error', 'message' => 'An error occurred while changing the password'], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    #[OA\Post(
        path: '/api/users/checkCode',
        summary: 'Verify Email Code',
        description: 'Verify a 6-digit verification code to activate a user account. This endpoint does not require authentication and is used to complete the user registration process by activating pending accounts.',
        tags: ['Users', 'Email', 'Verification']
    )]
    #[OA\RequestBody(
        required: true,
        description: 'Verification code received via email',
        content: new OA\JsonContent(
            type: 'object',
            required: ['verificationCode'],
            properties: [
                new OA\Property(
                    property: 'verificationCode',
                    type: 'integer',
                    description: '6-digit verification code',
                    example: 123456,
                    minimum: 100000,
                    maximum: 999999
                )
            ]
        )
    )]
    #[OA\Response(
        response: 201,
        description: 'User successfully activated',
        content: new OA\JsonContent(
            type: 'object',
            properties: [
                new OA\Property(property: 'type', type: 'string', example: 'success'),
                new OA\Property(property: 'message', type: 'string', example: 'User successfully activated')
            ]
        )
    )]
    #[OA\Response(
        response: 400,
        description: 'Bad Request - Invalid data or verification code format',
        content: new OA\JsonContent(
            type: 'object',
            properties: [
                new OA\Property(property: 'type', type: 'string', example: 'error'),
                new OA\Property(
                    property: 'message',
                    type: 'string',
                    enum: [
                        'Invalid data',
                        'Invalid verification code format'
                    ],
                    example: 'Invalid verification code format'
                )
            ]
        )
    )]
    #[OA\Response(
        response: 404,
        description: 'Not Found - Verification code does not exist or has already been used',
        content: new OA\JsonContent(
            type: 'object',
            properties: [
                new OA\Property(property: 'type', type: 'string', example: 'error'),
                new OA\Property(property: 'message', type: 'string', example: 'Invalid verification code')
            ]
        )
    )]
    #[OA\Response(
        response: 500,
        description: 'Internal Server Error - An unexpected error occurred during verification',
        content: new OA\JsonContent(
            type: 'object',
            properties: [
                new OA\Property(property: 'type', type: 'string', example: 'error'),
                new OA\Property(property: 'message', type: 'string', example: 'An error has occurred with the verification code')
            ]
        )
    )]
    #[Route('/checkCode', name: 'api_checkCode', methods: ['POST'])]
    public function checkCode(EntityManagerInterface $entityManager, Request $request): JsonResponse
    {
        try {
            $data = json_decode($request->getContent(), true);

            $verificationCode = (int)$this->globalService->validate($data['verificationCode']) ?? "";

            if ($verificationCode === "") {
                return $this->json(['type' => 'error', 'message' => 'Invalid data'], Response::HTTP_BAD_REQUEST);
            }

            if ($verificationCode > 999999 || $verificationCode < 100000) {
                return $this->json(['type' => 'error', 'message' => 'Invalid verification code format'], Response::HTTP_BAD_REQUEST);
            }

            $code = $entityManager->getRepository(Users::class)->findOneBy(['verification_code' => $verificationCode]);

            if (!$code) {
                return $this->json(['type' => 'error', 'message' => 'Invalid verification code'], Response::HTTP_NOT_FOUND);
            }

            $code->setVerificationCode(null);
            $code->setStatus('active');

            $entityManager->persist($code);
            $entityManager->flush();

            return $this->json(['type' => 'success', 'message' => 'User successfully activated'], Response::HTTP_CREATED);
        } catch (\Exception $e) {
            return $this->json(['type' => 'error', 'message' => 'An error has occurred with the verification code'], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}

