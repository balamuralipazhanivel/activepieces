import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
import { EmbeddingService } from '../embedding.service';
import {
  ActivepiecesClientEventName,
  ActivepiecesVendorEventName,
  ActivepiecesVendorInit,
  hideSidebarQueryParamName,
} from '@activepieces/ee-client-embedding-shared';
import { AuthenticationService } from '@activepieces/ui/common';

@Component({
  selector: 'ap-embed-redirect',
  templateUrl: './embed-redirect.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmbedRedirectComponent implements OnDestroy, OnInit {
  validateJWT$?: Observable<void>;
  showError = false;
  constructor(
    private route: ActivatedRoute,
    private embeddingService: EmbeddingService,
    private router: Router,
    private authenticationService: AuthenticationService
  ) {}

  ngOnInit(): void {
    const jwt = this.route.snapshot.queryParamMap.get('JWT_TOKEN');
    debugger;
    if (jwt === null) {
      throw new Error('Activepieces: no provided jwt token');
    }

    this.validateJWT$ = this.embeddingService
      .generateApToken({ externalAccessToken: jwt })
      .pipe(
        tap((res) => {
          this.authenticationService.saveToken(res.token);
          this.authenticationService.updateUser({ ...res, password: '' });
          window.parent.postMessage(
            {
              type: ActivepiecesClientEventName.CLIENT_INIT,
            },
            '*'
          );

          window.addEventListener('message', this.initializedVendorHandler);
        }),
        map(() => void 0)
      );
  }

  initializedVendorHandler = (event: MessageEvent<ActivepiecesVendorInit>) => {
    const hideSidebar =
      this.route.snapshot.queryParamMap
        .get(hideSidebarQueryParamName)
        ?.toLocaleLowerCase() === 'TRUE'.toLocaleLowerCase();

    if (
      event.source === window.parent &&
      event.data.type === ActivepiecesVendorEventName.VENDOR_INIT
    ) {
      this.embeddingService.setState({
        hideSideNav: hideSidebar,
        isEmbedded: true,
        prefix: event.data.data.prefix,
      });
      this.router.navigate([event.data.data.initialClientRoute], {
        skipLocationChange: true,
      });
    }
  };

  ngOnDestroy(): void {
    window.removeEventListener('message', this.initializedVendorHandler);
  }
}