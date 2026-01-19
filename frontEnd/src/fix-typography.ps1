# =============================================================================
# SCRIPT DE CORRECTION TYPOGRAPHIE RESPONSIVE - WINDOWS PowerShell
# Exécutez ce script dans votre dossier src/
# =============================================================================

Write-Host "🔤 Correction des tailles de police responsive..." -ForegroundColor Cyan

# Trouver tous les fichiers TSX
$files = Get-ChildItem -Path . -Filter "*.tsx" -Recurse

foreach ($file in $files) {
    Write-Host "  Traitement: $($file.FullName)" -ForegroundColor Gray
    
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    
    # ============================================
    # TITRES H1 - text-4xl → text-2xl sm:text-3xl md:text-4xl
    # ============================================
    $content = $content -replace 'className="text-4xl font-bold', 'className="text-2xl sm:text-3xl md:text-4xl font-bold'
    $content = $content -replace 'className="text-4xl font-semibold', 'className="text-2xl sm:text-3xl md:text-4xl font-semibold'
    $content = $content -replace 'className="text-4xl ', 'className="text-2xl sm:text-3xl md:text-4xl '
    
    # ============================================
    # TITRES H2 - text-3xl → text-xl sm:text-2xl md:text-3xl
    # ============================================
    $content = $content -replace 'className="text-3xl font-bold', 'className="text-xl sm:text-2xl md:text-3xl font-bold'
    $content = $content -replace 'className="text-3xl font-semibold', 'className="text-xl sm:text-2xl md:text-3xl font-semibold'
    $content = $content -replace 'className="text-3xl ', 'className="text-xl sm:text-2xl md:text-3xl '
    
    # ============================================
    # TITRES H3 - text-2xl → text-lg sm:text-xl md:text-2xl
    # ============================================
    $content = $content -replace 'className="text-2xl font-bold', 'className="text-lg sm:text-xl md:text-2xl font-bold'
    $content = $content -replace 'className="text-2xl font-semibold', 'className="text-lg sm:text-xl md:text-2xl font-semibold'
    
    # ============================================
    # PARAGRAPHES INTRO - text-lg text-muted → text-sm sm:text-base md:text-lg
    # ============================================
    $content = $content -replace 'className="text-lg text-muted-foreground', 'className="text-sm sm:text-base md:text-lg text-muted-foreground'
    
    # ============================================
    # STATS VALUES - text-2xl font-bold → text-xl sm:text-2xl font-bold
    # ============================================
    $content = $content -replace 'className="text-2xl font-bold">', 'className="text-xl sm:text-2xl font-bold">'
    
    # ============================================
    # LABELS - text-sm font-medium → text-xs sm:text-sm font-medium
    # ============================================
    $content = $content -replace 'className="text-sm font-medium', 'className="text-xs sm:text-sm font-medium'
    $content = $content -replace 'className="block text-sm font-medium', 'className="block text-xs sm:text-sm font-medium'
    
    # ============================================
    # ICÔNES STATS - h-8 w-8 → h-6 w-6 sm:h-8 sm:w-8
    # ============================================
    $content = $content -replace 'className="h-8 w-8 text-', 'className="h-6 w-6 sm:h-8 sm:w-8 text-'
    $content = $content -replace 'className="h-8 w-8"', 'className="h-6 w-6 sm:h-8 sm:w-8"'
    
    # ============================================
    # ICÔNES TITRES - h-6 w-6 → h-5 w-5 sm:h-6 sm:w-6
    # ============================================
    $content = $content -replace 'className="h-6 w-6 mr-', 'className="h-5 w-5 sm:h-6 sm:w-6 mr-'
    
    # Sauvegarder le fichier
    Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
}

Write-Host ""
Write-Host "✅ Terminé! Corrections appliquées." -ForegroundColor Green
Write-Host ""
Write-Host "📝 N'oubliez pas d'ajouter le CSS:" -ForegroundColor Yellow
Write-Host "   Get-Content typography-responsive-only.css | Add-Content src/index.css" -ForegroundColor White
