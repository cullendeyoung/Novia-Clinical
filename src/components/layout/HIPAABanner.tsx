export function HIPAABanner() {
  // Banner shows by default. Only hidden when VITE_HIDE_HIPAA_BANNER explicitly set to 'true'
  const hideBanner = import.meta.env.VITE_HIDE_HIPAA_BANNER === 'true'

  if (hideBanner) return null

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-1 text-center text-xs text-amber-800">
      This preview is not HIPAA compliant. Do not enter or store real patient data or PHI.
    </div>
  )
}
