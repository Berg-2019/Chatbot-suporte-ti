import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { UserRole, ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core'; // Import Reflector

describe('MetricsController (E2E)', () => {
    let app: INestApplication;
    let metricsService = {
        getDashboardSummary: () => ({ totalTickets: 100 }),
        getAllTechniciansMetrics: () => ([]),
        getTechnicianMetrics: (id: string) => ({ id, tickets: 10 }),
        getSectorMetrics: (startDate?: Date, endDate?: Date) => ({ total: 50 }),
    };
    let jwtService: JwtService;
    let reflector: Reflector;

    // Mock AuthGuard and RolesGuard to control user context
    const mockAuthGuard = {
        canActivate: jest.fn((context) => {
            const req = context.switchToHttp().getRequest();
            if (req.headers.authorization) {
                try {
                    const token = req.headers.authorization.split(' ')[1];
                    const payload = jwtService.decode(token);
                    req.user = payload;
                    return true;
                } catch (e) {
                    return false;
                }
            }
            return false;
        }),
    };

    const mockRolesGuard = {
        canActivate: jest.fn((context) => {
            const req = context.switchToHttp().getRequest();
            const user = req.user;
            if (!user) return false;

            // Use the injected reflector instance
            const requiredRoles = reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
                context.getHandler(),
                context.getClass(),
            ]);

            if (!requiredRoles) return true;

            return requiredRoles.some(role => user.role === role);
        }),
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [MetricsController],
            providers: [
                { provide: MetricsService, useValue: metricsService },
                JwtService,
                Reflector, // Provide Reflector
            ],
        })
            .overrideGuard(AuthGuard('jwt'))
            .useValue(mockAuthGuard)
            .overrideGuard(RolesGuard)
            .useValue(mockRolesGuard)
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();
        jwtService = moduleFixture.get<JwtService>(JwtService);
        reflector = moduleFixture.get<Reflector>(Reflector); // Get the Reflector instance
    });

    afterAll(async () => {
        await app.close();
    });

    const generateToken = (role: UserRole) => {
        // In a real app, this would involve signing a token.
        // For testing, we just need a decodable payload.
        return `Bearer ${jwtService.sign({ role: role, username: 'testuser', sub: '123' })}`;
    };

    const generateForbiddenToken = () => {
        return `Bearer ${jwtService.sign({ role: 'FORBIDDEN_ROLE', username: 'forbidden', sub: '456' })}`;
    }

    it('should block access without a token', async () => {
        await request(app.getHttpServer())
            .get('/metrics/dashboard')
            .expect(401); // Unauthorized
    });

    it('should allow access for ADMIN role', async () => {
        await request(app.getHttpServer())
            .get('/metrics/dashboard')
            .set('Authorization', generateToken(UserRole.ADMIN))
            .expect(200)
            .expect(metricsService.getDashboardSummary());
    });

    it('should allow access for AGENT role', async () => {
        await request(app.getHttpServer())
            .get('/metrics/dashboard')
            .set('Authorization', generateToken(UserRole.AGENT))
            .expect(200)
            .expect(metricsService.getDashboardSummary());
    });

    it('should allow access for VIEWER role', async () => {
        await request(app.getHttpServer())
            .get('/metrics/dashboard')
            .set('Authorization', generateToken(UserRole.VIEWER))
            .expect(200)
            .expect(metricsService.getDashboardSummary());
    });

    it('should block access for a forbidden role', async () => {
        await request(app.getHttpServer())
            .get('/metrics/dashboard')
            .set('Authorization', generateForbiddenToken())
            .expect(403); // Forbidden
    });

    // Test other endpoints
    it('should allow ADMIN to access /metrics/technicians', async () => {
        await request(app.getHttpServer())
            .get('/metrics/technicians')
            .set('Authorization', generateToken(UserRole.ADMIN))
            .expect(200)
            .expect(metricsService.getAllTechniciansMetrics());
    });

    it('should block FORBIDDEN_ROLE from accessing /metrics/technicians', async () => {
        await request(app.getHttpServer())
            .get('/metrics/technicians')
            .set('Authorization', generateForbiddenToken())
            .expect(403);
    });
});
