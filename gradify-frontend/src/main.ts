import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
import { LoggingInterceptor } from './app/core/interceptors/logging.interceptor';
import { graphqlProviders } from './app/graphql/graphql.provider';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(
      withInterceptors([authInterceptor]),
      withInterceptorsFromDi()
    ),
    { provide: HTTP_INTERCEPTORS, useClass: LoggingInterceptor, multi: true },
    ...graphqlProviders
  ]
}).catch(err => console.error(err));




