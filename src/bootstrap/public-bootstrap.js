import { resolveTenantContext } from '../core/tenant-context.js';
import { createRestaurantRepository } from '../data/restaurant-repository.js';
import { fixtureAdapter } from '../data/adapters/fixture-adapter.js';
import { applyRestaurantBackgroundVideo } from '../ui/background-video.js';

const repository = createRestaurantRepository({ adapter: fixtureAdapter });

function showBootFailure(error) {
  console.error('RESTBR_PUBLIC_BOOT_FAILED', error);

  const gate = document.getElementById('restbrDiningGate');
  if (!gate) return;

  gate.classList.remove('hidden', 'loading');
  gate.innerHTML = `
    <div class="sm-dining-card" role="alert">
      <div class="sm-dining-mark">⚠️</div>
      <h2>تعذر تحميل المنيو</h2>
      <p>يرجى المحاولة مرة أخرى بعد قليل.</p>
    </div>
  `;
}

async function bootPublicMenu() {
  const tenant = await resolveTenantContext({
    hostname: window.location.hostname,
    search: window.location.search,
    platformDomain: 'restbr.com',
    resolveDomain: (request) => repository.resolveDomain(request)
  });

  const model = await repository.getPublicMenu(tenant);

  window.RESTBR_TENANT_CONTEXT = tenant;
  window.RESTBR_PUBLIC_MENU_MODEL = model;

  applyRestaurantBackgroundVideo({ settings: model.settings });

  // Temporary compatibility bridge for the pinned Gold UI runtime.
  // The global exists only during module evaluation; the runtime immediately
  // captures the normalized model into its private closure.
  window.RESTBR_GOLD_FIXTURE = model;
  try {
    await import('../fixture/public-runtime.js');
  } finally {
    delete window.RESTBR_GOLD_FIXTURE;
  }

  window.dispatchEvent(new CustomEvent('restbr:public-ready', {
    detail: { tenant }
  }));
}

bootPublicMenu().catch(showBootFailure);
