import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { SystemStatusService, SystemStatus } from '../../../core/services/system-status.service';

@Component({
  selector: 'app-grpc-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grpc-status" [class.expanded]="expanded" (click)="expanded = !expanded">
      <div class="status-indicator" [class.ok]="allOk" [class.warning]="!allOk && hasPartial" [class.error]="!allOk && !hasPartial">
        <span class="dot"></span>
        <span class="label">{{ allOk ? 'gRPC' : 'gRPC!' }}</span>
      </div>
      
      <div class="status-details" *ngIf="expanded && status">
        <div class="status-header">
          <strong>Service-Kommunikation</strong>
          <small>{{ status.timestamp | date:'HH:mm:ss' }}</small>
        </div>
        
        <div class="service-group">
          <div class="service-name">Auth → User</div>
          <div class="service-status" [class.ok]="status.authService.grpc.userService?.available">
            <span class="protocol">gRPC:9082</span>
            <span class="status-text">{{ status.authService.grpc.userService?.message || 'N/A' }}</span>
          </div>
        </div>
        
        <div class="service-group">
          <div class="service-name">Berechnung → Noten</div>
          <div class="service-status" [class.ok]="status.berechnungsService.grpc.notenService?.available">
            <span class="protocol">gRPC:9084</span>
            <span class="status-text">{{ status.berechnungsService.grpc.notenService?.message || 'N/A' }}</span>
          </div>
        </div>
        
        <div class="service-group">
          <div class="service-name">Berechnung → Studiengang</div>
          <div class="service-status" [class.ok]="status.berechnungsService.grpc.studiengangService?.available">
            <span class="protocol">gRPC:9083</span>
            <span class="status-text">{{ status.berechnungsService.grpc.studiengangService?.message || 'N/A' }}</span>
          </div>
        </div>
        
        <div class="status-footer" title="Noten kommen via GraphQL. gRPC nur für Gesamtnote. Bei gRPC-Ausfall berechnet das Frontend lokal aus den geladenen Noten.">
          <small>Noten: GraphQL. gRPC: Gesamtnote. Fallback: lokale Berechnung.</small>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .grpc-status {
      position: relative;
      cursor: pointer;
      user-select: none;
    }
    
    .status-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 12px;
      background: rgba(255,255,255,0.1);
      font-size: 12px;
      transition: all 0.2s;
    }
    
    .status-indicator:hover {
      background: rgba(255,255,255,0.2);
    }
    
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #888;
    }
    
    .status-indicator.ok .dot { background: #4caf50; }
    .status-indicator.warning .dot { background: #ff9800; }
    .status-indicator.error .dot { background: #f44336; }
    
    .label {
      color: rgba(255,255,255,0.9);
      font-weight: 500;
    }
    
    .status-details {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 8px;
      background: #1e1e2e;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 12px;
      min-width: 280px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 1000;
    }
    
    .status-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #333;
      color: #fff;
    }
    
    .status-header small {
      color: #888;
    }
    
    .service-group {
      margin-bottom: 8px;
    }
    
    .service-name {
      font-size: 11px;
      color: #888;
      margin-bottom: 2px;
    }
    
    .service-status {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 8px;
      background: rgba(244,67,54,0.1);
      border-radius: 4px;
      border-left: 3px solid #f44336;
    }
    
    .service-status.ok {
      background: rgba(76,175,80,0.1);
      border-left-color: #4caf50;
    }
    
    .protocol {
      font-family: monospace;
      font-size: 11px;
      color: #64b5f6;
    }
    
    .status-text {
      font-size: 12px;
      color: #fff;
    }
    
    .status-footer {
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid #333;
      text-align: center;
      color: #4caf50;
    }
  `]
})
export class GrpcStatusComponent implements OnInit, OnDestroy {
  status: SystemStatus | null = null;
  expanded = false;
  private subscription?: Subscription;

  get allOk(): boolean {
    return this.status?.allGrpcAvailable ?? false;
  }

  get hasPartial(): boolean {
    if (!this.status) return false;
    const auth = this.status.authService.grpc.userService?.available ?? false;
    const noten = this.status.berechnungsService.grpc.notenService?.available ?? false;
    const studiengang = this.status.berechnungsService.grpc.studiengangService?.available ?? false;
    return auth || noten || studiengang;
  }

  constructor(private statusService: SystemStatusService) {}

  ngOnInit(): void {
    // Initial fetch
    this.fetchStatus();
    
    // Poll every 30 seconds
    this.subscription = interval(30000).pipe(
      switchMap(() => this.statusService.getFullStatus())
    ).subscribe(status => {
      this.status = status;
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private fetchStatus(): void {
    this.statusService.getFullStatus().subscribe(status => {
      this.status = status;
    });
  }
}
