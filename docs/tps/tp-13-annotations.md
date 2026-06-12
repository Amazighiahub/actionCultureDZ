# TP 13 — Annotations : Surlignages, Notes et Signets

> **Durée estimée :** 12 heures sur 3 jours
> **Niveau :** Avancé
> **Prérequis :** TP 12 terminé (lecteur EPUB Readium fonctionnel)

---

## Objectifs d'apprentissage

À la fin de ce TP, tu sauras :
- [ ] Implémenter la sélection de texte dans Readium et capturer la sélection
- [ ] Créer les entités Room `HighlightEntity`, `NoteEntity`, `BookmarkEntity`
- [ ] Afficher les surlignages colorés persistants dans le lecteur
- [ ] Créer un panneau "Mes annotations" avec liste et navigation directe
- [ ] Attacher une note à un surlignage
- [ ] Exporter les annotations en texte (partage Android)

---

## Concepts théoriques

### Locator Readium et annotations

Chaque annotation est associée à un `Locator` Readium qui encode précisément sa position dans l'EPUB :

```json
{
  "href": "chapter02.xhtml",
  "type": "application/xhtml+xml",
  "title": "Chapitre 2",
  "locations": {
    "cfi": "epubcfi(/6/4!/4/2/1:23)",
    "progression": 0.45
  },
  "text": {
    "highlight": "le texte sélectionné",
    "before": "...contexte avant...",
    "after": "...contexte après..."
  }
}
```

### 4 types d'annotations

| Type | Description | Interaction |
|------|-------------|-------------|
| Surlignage (Highlight) | Coloré dans le texte | Clic → voir/modifier la note |
| Note | Texte libre attaché à un surlignage | Icône dans le texte |
| Signet (Bookmark) | Marque une position sans sélection | Navigation rapide |
| Position de lecture | Dernière page lue | Restauration automatique (TP 12) |

---

## Étape 1 — Entités Room pour les annotations

### 1.1 `HighlightEntity.kt`

```kotlin
// core/core-database/src/main/java/com/taladz/core/database/entity/HighlightEntity.kt
package com.taladz.core.database.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "highlights")
data class HighlightEntity(
    @PrimaryKey(autoGenerate = true)
    @ColumnInfo(name = "id")
    val id           : Int    = 0,

    @ColumnInfo(name = "id_oeuvre")
    val idOeuvre     : Int,

    @ColumnInfo(name = "locator_json")
    val locatorJson  : String,         // JSON du Locator Readium

    @ColumnInfo(name = "color")
    val color        : Int    = HighlightColor.YELLOW.argb,  // couleur ARGB

    @ColumnInfo(name = "selected_text")
    val selectedText : String,         // texte sélectionné (pour export)

    @ColumnInfo(name = "chapter_title")
    val chapterTitle : String? = null,

    @ColumnInfo(name = "progression")
    val progression  : Double = 0.0,

    @ColumnInfo(name = "created_at")
    val createdAt    : Long   = System.currentTimeMillis(),
)

enum class HighlightColor(val argb: Int, val label: String) {
    YELLOW  (0xFFFFEB3B.toInt(), "Jaune"),
    GREEN   (0xFF4CAF50.toInt(), "Vert"),
    BLUE    (0xFF2196F3.toInt(), "Bleu"),
    PINK    (0xFFE91E63.toInt(), "Rose"),
    ORANGE  (0xFFFF9800.toInt(), "Orange"),
}
```

### 1.2 `NoteEntity.kt`

```kotlin
// core/core-database/src/main/java/com/taladz/core/database/entity/NoteEntity.kt
package com.taladz.core.database.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.PrimaryKey

@Entity(
    tableName    = "notes",
    foreignKeys  = [
        ForeignKey(
            entity        = HighlightEntity::class,
            parentColumns = ["id"],
            childColumns  = ["highlight_id"],
            onDelete      = ForeignKey.CASCADE,
        )
    ],
)
data class NoteEntity(
    @PrimaryKey(autoGenerate = true)
    val id           : Int    = 0,

    @ColumnInfo(name = "highlight_id")
    val highlightId  : Int,

    @ColumnInfo(name = "id_oeuvre")
    val idOeuvre     : Int,

    @ColumnInfo(name = "content")
    val content      : String,

    @ColumnInfo(name = "updated_at")
    val updatedAt    : Long = System.currentTimeMillis(),
)
```

### 1.3 `BookmarkEntity.kt`

```kotlin
// core/core-database/src/main/java/com/taladz/core/database/entity/BookmarkEntity.kt
package com.taladz.core.database.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "bookmarks")
data class BookmarkEntity(
    @PrimaryKey(autoGenerate = true)
    val id           : Int    = 0,

    @ColumnInfo(name = "id_oeuvre")
    val idOeuvre     : Int,

    @ColumnInfo(name = "locator_json")
    val locatorJson  : String,

    @ColumnInfo(name = "chapter_title")
    val chapterTitle : String? = null,

    @ColumnInfo(name = "progression")
    val progression  : Double = 0.0,

    @ColumnInfo(name = "created_at")
    val createdAt    : Long = System.currentTimeMillis(),
)
```

### 1.4 Relation Highlight + Note

```kotlin
// core/core-database/src/main/java/com/taladz/core/database/relation/HighlightWithNote.kt
package com.taladz.core.database.relation

import androidx.room.Embedded
import androidx.room.Relation
import com.taladz.core.database.entity.HighlightEntity
import com.taladz.core.database.entity.NoteEntity

data class HighlightWithNote(
    @Embedded
    val highlight : HighlightEntity,

    @Relation(
        parentColumn = "id",
        entityColumn = "highlight_id",
    )
    val note      : NoteEntity?,
)
```

---

## Étape 2 — DAOs des annotations

### 2.1 `HighlightDao.kt`

```kotlin
// core/core-database/src/main/java/com/taladz/core/database/dao/HighlightDao.kt
package com.taladz.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import com.taladz.core.database.entity.HighlightEntity
import com.taladz.core.database.relation.HighlightWithNote
import kotlinx.coroutines.flow.Flow

@Dao
interface HighlightDao {

    @Transaction
    @Query("SELECT * FROM highlights WHERE id_oeuvre = :bookId ORDER BY progression")
    fun getHighlightsForBook(bookId: Int): Flow<List<HighlightWithNote>>

    @Query("SELECT * FROM highlights WHERE id = :id")
    suspend fun getHighlight(id: Int): HighlightEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertHighlight(highlight: HighlightEntity): Long

    @Query("UPDATE highlights SET color = :color WHERE id = :id")
    suspend fun updateColor(id: Int, color: Int)

    @Query("DELETE FROM highlights WHERE id = :id")
    suspend fun deleteHighlight(id: Int)

    @Query("SELECT COUNT(*) FROM highlights WHERE id_oeuvre = :bookId")
    suspend fun countHighlights(bookId: Int): Int
}
```

### 2.2 `NoteDao.kt`

```kotlin
// core/core-database/src/main/java/com/taladz/core/database/dao/NoteDao.kt
package com.taladz.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.taladz.core.database.entity.NoteEntity

@Dao
interface NoteDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertNote(note: NoteEntity): Long

    @Query("SELECT * FROM notes WHERE highlight_id = :highlightId")
    suspend fun getNoteForHighlight(highlightId: Int): NoteEntity?

    @Update
    suspend fun updateNote(note: NoteEntity)

    @Query("DELETE FROM notes WHERE highlight_id = :highlightId")
    suspend fun deleteNoteForHighlight(highlightId: Int)
}
```

### 2.3 `BookmarkDao.kt`

```kotlin
// core/core-database/src/main/java/com/taladz/core/database/dao/BookmarkDao.kt
package com.taladz.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.taladz.core.database.entity.BookmarkEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface BookmarkDao {

    @Query("SELECT * FROM bookmarks WHERE id_oeuvre = :bookId ORDER BY progression")
    fun getBookmarksForBook(bookId: Int): Flow<List<BookmarkEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertBookmark(bookmark: BookmarkEntity): Long

    @Query("DELETE FROM bookmarks WHERE id = :id")
    suspend fun deleteBookmark(id: Int)

    @Query("SELECT COUNT(*) FROM bookmarks WHERE id_oeuvre = :bookId")
    suspend fun countBookmarks(bookId: Int): Int
}
```

### 2.4 Mettre à jour `TaladzDatabase.kt`

```kotlin
@Database(
    entities  = [
        BookEntity::class,
        MediaEntity::class,
        CacheMetaEntity::class,
        DownloadEntity::class,
        ReadingPositionEntity::class,
        HighlightEntity::class,
        NoteEntity::class,
        BookmarkEntity::class,
    ],
    version   = 4,  // ← incrémenter
    exportSchema = true,
)
abstract class TaladzDatabase : RoomDatabase() {
    abstract fun bookDao(): BookDao
    abstract fun mediaDao(): MediaDao
    abstract fun cacheMetaDao(): CacheMetaDao
    abstract fun downloadDao(): DownloadDao
    abstract fun readingPositionDao(): ReadingPositionDao
    abstract fun highlightDao(): HighlightDao
    abstract fun noteDao(): NoteDao
    abstract fun bookmarkDao(): BookmarkDao
}
```

---

## Étape 3 — `AnnotationsRepository`

```kotlin
// data/data-reader/src/main/java/com/taladz/data/reader/repository/AnnotationsRepository.kt
package com.taladz.data.reader.repository

import com.taladz.core.database.dao.BookmarkDao
import com.taladz.core.database.dao.HighlightDao
import com.taladz.core.database.dao.NoteDao
import com.taladz.core.database.entity.BookmarkEntity
import com.taladz.core.database.entity.HighlightEntity
import com.taladz.core.database.entity.HighlightColor
import com.taladz.core.database.entity.NoteEntity
import com.taladz.core.database.relation.HighlightWithNote
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AnnotationsRepository @Inject constructor(
    private val highlightDao : HighlightDao,
    private val noteDao      : NoteDao,
    private val bookmarkDao  : BookmarkDao,
) {

    // ─── Surlignages ─────────────────────────────────────────────────────────

    fun getHighlights(bookId: Int): Flow<List<HighlightWithNote>> =
        highlightDao.getHighlightsForBook(bookId)

    suspend fun addHighlight(
        bookId       : Int,
        locatorJson  : String,
        selectedText : String,
        color        : HighlightColor     = HighlightColor.YELLOW,
        chapterTitle : String?            = null,
        progression  : Double             = 0.0,
    ): Long = highlightDao.insertHighlight(
        HighlightEntity(
            idOeuvre     = bookId,
            locatorJson  = locatorJson,
            color        = color.argb,
            selectedText = selectedText,
            chapterTitle = chapterTitle,
            progression  = progression,
        )
    )

    suspend fun changeHighlightColor(highlightId: Int, color: HighlightColor) {
        highlightDao.updateColor(highlightId, color.argb)
    }

    suspend fun deleteHighlight(highlightId: Int) {
        highlightDao.deleteHighlight(highlightId)
    }

    // ─── Notes ───────────────────────────────────────────────────────────────

    suspend fun addOrUpdateNote(highlightId: Int, bookId: Int, content: String) {
        val existing = noteDao.getNoteForHighlight(highlightId)
        if (existing != null) {
            noteDao.updateNote(existing.copy(content = content, updatedAt = System.currentTimeMillis()))
        } else {
            noteDao.insertNote(
                NoteEntity(
                    highlightId = highlightId,
                    idOeuvre    = bookId,
                    content     = content,
                )
            )
        }
    }

    suspend fun deleteNote(highlightId: Int) {
        noteDao.deleteNoteForHighlight(highlightId)
    }

    // ─── Signets ──────────────────────────────────────────────────────────────

    fun getBookmarks(bookId: Int): Flow<List<BookmarkEntity>> =
        bookmarkDao.getBookmarksForBook(bookId)

    suspend fun addBookmark(
        bookId       : Int,
        locatorJson  : String,
        chapterTitle : String? = null,
        progression  : Double  = 0.0,
    ): Long = bookmarkDao.insertBookmark(
        BookmarkEntity(
            idOeuvre     = bookId,
            locatorJson  = locatorJson,
            chapterTitle = chapterTitle,
            progression  = progression,
        )
    )

    suspend fun deleteBookmark(bookmarkId: Int) {
        bookmarkDao.deleteBookmark(bookmarkId)
    }

    // ─── Export ───────────────────────────────────────────────────────────────

    suspend fun exportAnnotations(
        bookId    : Int,
        bookTitle : String,
        highlights: List<HighlightWithNote>,
        bookmarks : List<BookmarkEntity>,
    ): String = buildString {
        appendLine("=== Annotations — $bookTitle ===")
        appendLine()

        if (highlights.isNotEmpty()) {
            appendLine("── Surlignages (${highlights.size}) ──")
            highlights.forEach { hw ->
                appendLine()
                val chapter = hw.highlight.chapterTitle ?: "Position inconnue"
                val percent = (hw.highlight.progression * 100).toInt()
                appendLine("[$chapter — $percent%]")
                appendLine("\"${hw.highlight.selectedText}\"")
                hw.note?.let { note ->
                    appendLine("  Note : ${note.content}")
                }
            }
            appendLine()
        }

        if (bookmarks.isNotEmpty()) {
            appendLine("── Signets (${bookmarks.size}) ──")
            bookmarks.forEach { bm ->
                val chapter = bm.chapterTitle ?: "?"
                val percent = (bm.progression * 100).toInt()
                appendLine("• $chapter — $percent%")
            }
        }
    }
}
```

---

## Étape 4 — `AnnotationsViewModel`

```kotlin
// feature/feature-reader/src/main/java/com/taladz/feature/reader/AnnotationsViewModel.kt
package com.taladz.feature.reader

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.taladz.core.database.entity.BookmarkEntity
import com.taladz.core.database.entity.HighlightColor
import com.taladz.core.database.relation.HighlightWithNote
import com.taladz.data.reader.repository.AnnotationsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AnnotationsViewModel @Inject constructor(
    private val repo: AnnotationsRepository,
) : ViewModel() {

    private var currentBookId: Int = -1

    lateinit var highlights: StateFlow<List<HighlightWithNote>>
    lateinit var bookmarks : StateFlow<List<BookmarkEntity>>

    fun init(bookId: Int) {
        if (currentBookId == bookId) return
        currentBookId = bookId

        highlights = repo.getHighlights(bookId).stateIn(
            scope        = viewModelScope,
            started      = SharingStarted.WhileSubscribed(5_000),
            initialValue = emptyList(),
        )
        bookmarks = repo.getBookmarks(bookId).stateIn(
            scope        = viewModelScope,
            started      = SharingStarted.WhileSubscribed(5_000),
            initialValue = emptyList(),
        )
    }

    fun addHighlight(
        locatorJson  : String,
        selectedText : String,
        color        : HighlightColor = HighlightColor.YELLOW,
        chapterTitle : String? = null,
        progression  : Double  = 0.0,
        onCreated    : (Long) -> Unit = {},
    ) {
        viewModelScope.launch {
            val id = repo.addHighlight(currentBookId, locatorJson, selectedText, color, chapterTitle, progression)
            onCreated(id)
        }
    }

    fun updateHighlightColor(highlightId: Int, color: HighlightColor) {
        viewModelScope.launch { repo.changeHighlightColor(highlightId, color) }
    }

    fun deleteHighlight(highlightId: Int) {
        viewModelScope.launch { repo.deleteHighlight(highlightId) }
    }

    fun saveNote(highlightId: Int, content: String) {
        viewModelScope.launch { repo.addOrUpdateNote(highlightId, currentBookId, content) }
    }

    fun addBookmark(locatorJson: String, chapterTitle: String?, progression: Double) {
        viewModelScope.launch { repo.addBookmark(currentBookId, locatorJson, chapterTitle, progression) }
    }

    fun deleteBookmark(bookmarkId: Int) {
        viewModelScope.launch { repo.deleteBookmark(bookmarkId) }
    }

    fun exportAnnotations(bookTitle: String, onExported: (String) -> Unit) {
        viewModelScope.launch {
            val text = repo.exportAnnotations(
                bookId    = currentBookId,
                bookTitle = bookTitle,
                highlights = highlights.value,
                bookmarks  = bookmarks.value,
            )
            onExported(text)
        }
    }
}
```

---

## Étape 5 — Panneau d'annotations

```kotlin
// feature/feature-reader/src/main/java/com/taladz/feature/reader/AnnotationsPanel.kt
package com.taladz.feature.reader

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Notes
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.taladz.core.database.entity.BookmarkEntity
import com.taladz.core.database.entity.HighlightColor
import com.taladz.core.database.relation.HighlightWithNote

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AnnotationsPanel(
    highlights     : List<HighlightWithNote>,
    bookmarks      : List<BookmarkEntity>,
    onHighlightClick : (String) -> Unit,   // navigue vers le locatorJson
    onBookmarkClick  : (String) -> Unit,
    onDeleteHighlight: (Int) -> Unit,
    onDeleteBookmark : (Int) -> Unit,
    onExport         : () -> Unit,
    onDismiss        : () -> Unit,
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Surlignages (${highlights.size})", "Signets (${bookmarks.size})")

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        modifier         = Modifier.fillMaxHeight(0.85f),
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // ── Header ────────────────────────────────────────────────────────
            Row(
                modifier              = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment     = Alignment.CenterVertically,
            ) {
                Text("Mes annotations", style = MaterialTheme.typography.titleMedium)
                TextButton(onClick = onExport) {
                    Text("Exporter")
                }
            }

            // ── Onglets ───────────────────────────────────────────────────────
            TabRow(selectedTabIndex = selectedTab) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTab == index,
                        onClick  = { selectedTab = index },
                        text     = { Text(title, style = MaterialTheme.typography.labelMedium) },
                    )
                }
            }

            // ── Contenu ───────────────────────────────────────────────────────
            LazyColumn(
                contentPadding      = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                if (selectedTab == 0) {
                    if (highlights.isEmpty()) {
                        item { EmptyAnnotationsView(message = "Aucun surlignage") }
                    } else {
                        items(highlights, key = { it.highlight.id }) { hw ->
                            HighlightItem(
                                hw        = hw,
                                onClick   = { onHighlightClick(hw.highlight.locatorJson) },
                                onDelete  = { onDeleteHighlight(hw.highlight.id) },
                            )
                        }
                    }
                } else {
                    if (bookmarks.isEmpty()) {
                        item { EmptyAnnotationsView(message = "Aucun signet") }
                    } else {
                        items(bookmarks, key = { it.id }) { bm ->
                            BookmarkItem(
                                bookmark  = bm,
                                onClick   = { onBookmarkClick(bm.locatorJson) },
                                onDelete  = { onDeleteBookmark(bm.id) },
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun HighlightItem(
    hw       : HighlightWithNote,
    onClick  : () -> Unit,
    onDelete : () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        colors   = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant,
        ),
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                // Barre de couleur du surlignage
                Box(
                    modifier = Modifier
                        .width(4.dp)
                        .height(40.dp)
                        .background(Color(hw.highlight.color))
                )
                Spacer(modifier = Modifier.width(8.dp))
                Column(modifier = Modifier.weight(1f)) {
                    hw.highlight.chapterTitle?.let { chapter ->
                        Text(
                            text  = chapter,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary,
                        )
                    }
                    Text(
                        text     = "\"${hw.highlight.selectedText}\"",
                        style    = MaterialTheme.typography.bodySmall,
                        maxLines = 3,
                    )
                }
                IconButton(onClick = onDelete, modifier = Modifier.size(36.dp)) {
                    Icon(Icons.Default.Delete, "Supprimer", modifier = Modifier.size(18.dp))
                }
            }
            hw.note?.let { note ->
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.Top) {
                    Icon(
                        Icons.Default.Notes,
                        contentDescription = null,
                        modifier           = Modifier.size(14.dp),
                        tint               = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text  = note.content,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

@Composable
private fun BookmarkItem(
    bookmark : BookmarkEntity,
    onClick  : () -> Unit,
    onDelete : () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
    ) {
        Row(
            modifier          = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Default.Bookmark, contentDescription = null,
                tint = MaterialTheme.colorScheme.primary)
            Spacer(modifier = Modifier.width(8.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text  = bookmark.chapterTitle ?: "Position ${(bookmark.progression * 100).toInt()}%",
                    style = MaterialTheme.typography.bodyMedium,
                )
                Text(
                    text  = "${(bookmark.progression * 100).toInt()}% du livre",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            IconButton(onClick = onDelete) {
                Icon(Icons.Default.Delete, "Supprimer")
            }
        }
    }
}

@Composable
private fun EmptyAnnotationsView(message: String) {
    Box(
        modifier         = Modifier.fillMaxWidth().padding(32.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text  = message,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
```

---

## Étape 6 — Menu contextuel de sélection de texte

Quand l'utilisateur sélectionne du texte dans Readium, on affiche un menu contextuel :

```kotlin
// feature/feature-reader/src/main/java/com/taladz/feature/reader/SelectionMenu.kt
package com.taladz.feature.reader

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Notes
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.taladz.core.database.entity.HighlightColor

@Composable
fun SelectionMenu(
    selectedText   : String,
    onHighlight    : (HighlightColor) -> Unit,
    onAddNote      : () -> Unit,
    onDismiss      : () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title   = { Text("Sélection") },
        text    = {
            Text(
                text     = "\"$selectedText\"",
                style    = MaterialTheme.typography.bodySmall,
                maxLines = 3,
            )
        },
        confirmButton = {
            Column {
                // ── Couleurs de surlignage ─────────────────────────────────
                Row {
                    HighlightColor.entries.forEach { color ->
                        IconButton(onClick = { onHighlight(color) }) {
                            Surface(
                                color  = Color(color.argb),
                                shape  = MaterialTheme.shapes.small,
                            ) {
                                Spacer(modifier = Modifier.width(24.dp))
                            }
                        }
                    }
                }
                // ── Actions ────────────────────────────────────────────────
                TextButton(onClick = onAddNote) {
                    Icon(Icons.Default.Notes, contentDescription = null)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Ajouter une note")
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Annuler") }
        },
    )
}

@Composable
fun NoteDialog(
    initialContent : String = "",
    onSave         : (String) -> Unit,
    onDismiss      : () -> Unit,
) {
    var text by remember { mutableStateOf(initialContent) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title   = { Text("Note") },
        text    = {
            OutlinedTextField(
                value         = text,
                onValueChange = { text = it },
                placeholder   = { Text("Votre note…") },
                minLines      = 3,
                maxLines      = 6,
            )
        },
        confirmButton = {
            Button(onClick = { onSave(text) }, enabled = text.isNotBlank()) {
                Text("Enregistrer")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Annuler") }
        },
    )
}
```

---

## Étape 7 — Intégrer les annotations dans `ReaderScreen`

### 7.1 Mettre à jour `ReaderScreen.kt`

```kotlin
// Ajouter dans ReaderScreen :
val annotationsViewModel: AnnotationsViewModel = hiltViewModel()
val highlights by annotationsViewModel.highlights.collectAsStateWithLifecycle()
val bookmarks  by annotationsViewModel.bookmarks.collectAsStateWithLifecycle()

LaunchedEffect(state.publication) {
    if (state.publication != null) {
        annotationsViewModel.init(bookId)
    }
}

var showAnnotationsPanel by remember { mutableStateOf(false) }
var showSelectionMenu    by remember { mutableStateOf(false) }
var currentSelection     by remember { mutableStateOf("") }
var showNoteDialog       by remember { mutableStateOf(false) }
var pendingHighlightId   by remember { mutableStateOf(-1L) }

// ── Bouton d'annotation dans la TopBar ──────────────────────────────────────
// Ajouter dans ReaderTopBar :
IconButton(onClick = { showAnnotationsPanel = true }) {
    BadgedBox(badge = {
        if (highlights.isNotEmpty()) {
            Badge { Text("${highlights.size}") }
        }
    }) {
        Icon(Icons.Default.Notes, "Annotations")
    }
}

// ── Partage/Export ──────────────────────────────────────────────────────────
val context = LocalContext.current
fun shareAnnotations(text: String) {
    val intent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
        type    = "text/plain"
        putExtra(android.content.Intent.EXTRA_TEXT, text)
        putExtra(android.content.Intent.EXTRA_SUBJECT, "Annotations — ${state.publication?.metadata?.title}")
    }
    context.startActivity(android.content.Intent.createChooser(intent, "Partager via"))
}

// ── Panneaux et dialogs ──────────────────────────────────────────────────────
if (showAnnotationsPanel) {
    AnnotationsPanel(
        highlights        = highlights,
        bookmarks         = bookmarks,
        onHighlightClick  = { locator -> /* naviguer avec Readium */ },
        onBookmarkClick   = { locator -> /* naviguer avec Readium */ },
        onDeleteHighlight = annotationsViewModel::deleteHighlight,
        onDeleteBookmark  = annotationsViewModel::deleteBookmark,
        onExport          = {
            annotationsViewModel.exportAnnotations(
                bookTitle  = state.publication?.metadata?.title ?: "Livre",
                onExported = { text -> shareAnnotations(text) },
            )
        },
        onDismiss         = { showAnnotationsPanel = false },
    )
}

if (showSelectionMenu) {
    SelectionMenu(
        selectedText = currentSelection,
        onHighlight  = { color ->
            showSelectionMenu = false
            annotationsViewModel.addHighlight(
                locatorJson  = "",  // ← récupéré depuis Readium
                selectedText = currentSelection,
                color        = color,
                onCreated    = { id -> pendingHighlightId = id },
            )
        },
        onAddNote    = { showSelectionMenu = false; showNoteDialog = true },
        onDismiss    = { showSelectionMenu = false },
    )
}

if (showNoteDialog && pendingHighlightId > 0) {
    NoteDialog(
        onSave    = { content ->
            annotationsViewModel.saveNote(pendingHighlightId.toInt(), content)
            showNoteDialog     = false
            pendingHighlightId = -1L
        },
        onDismiss = { showNoteDialog = false },
    )
}
```

---

## Étape 8 — Tests des annotations

```kotlin
// data/data-reader/src/test/java/com/taladz/data/reader/AnnotationsRepositoryTest.kt
package com.taladz.data.reader

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.taladz.core.database.TaladzDatabase
import com.taladz.core.database.entity.HighlightColor
import com.taladz.data.reader.repository.AnnotationsRepository
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AnnotationsRepositoryTest {

    private lateinit var db         : TaladzDatabase
    private lateinit var repository : AnnotationsRepository

    @Before
    fun setUp() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        db = Room.inMemoryDatabaseBuilder(context, TaladzDatabase::class.java)
            .allowMainThreadQueries()
            .build()
        repository = AnnotationsRepository(db.highlightDao(), db.noteDao(), db.bookmarkDao())
    }

    @After
    fun tearDown() { db.close() }

    @Test
    fun addHighlight_thenRetrieve() = runTest {
        repository.addHighlight(
            bookId       = 1,
            locatorJson  = """{"href": "ch1.xhtml"}""",
            selectedText = "Texte important",
            color        = HighlightColor.YELLOW,
        )
        val highlights = repository.getHighlights(1).first()
        assertEquals(1, highlights.size)
        assertEquals("Texte important", highlights[0].highlight.selectedText)
        assertEquals(HighlightColor.YELLOW.argb, highlights[0].highlight.color)
    }

    @Test
    fun addNoteToHighlight() = runTest {
        val id = repository.addHighlight(
            bookId = 1,
            locatorJson = "{}", selectedText = "Test", color = HighlightColor.GREEN,
        )
        repository.addOrUpdateNote(id.toInt(), 1, "Ma note de lecture")
        val highlights = repository.getHighlights(1).first()
        assertNotNull(highlights[0].note)
        assertEquals("Ma note de lecture", highlights[0].note?.content)
    }

    @Test
    fun deleteHighlight_cascadeDeletesNote() = runTest {
        val id = repository.addHighlight(1, "{}", "Test", HighlightColor.BLUE)
        repository.addOrUpdateNote(id.toInt(), 1, "Note à supprimer")
        repository.deleteHighlight(id.toInt())
        val highlights = repository.getHighlights(1).first()
        assertEquals(0, highlights.size)
    }

    @Test
    fun addBookmark_thenDelete() = runTest {
        val id = repository.addBookmark(1, """{"href":"ch2.xhtml"}""", "Chapitre 2", 0.5)
        val bookmarks = repository.getBookmarks(1).first()
        assertEquals(1, bookmarks.size)
        repository.deleteBookmark(id.toInt())
        assertEquals(0, repository.getBookmarks(1).first().size)
    }

    @Test
    fun exportAnnotations_format() = runTest {
        repository.addHighlight(1, "{}", "Texte surligné", HighlightColor.YELLOW,
            chapterTitle = "Chapitre 1", progression = 0.25)
        repository.addBookmark(1, "{}", "Chapitre 2", 0.5)

        val highlights = repository.getHighlights(1).first()
        val bookmarks  = repository.getBookmarks(1).first()
        val exported   = repository.exportAnnotations(1, "Nedjma", highlights, bookmarks)

        assert(exported.contains("Nedjma"))
        assert(exported.contains("Texte surligné"))
        assert(exported.contains("Chapitre 2"))
    }
}
```

---

## Récapitulatif des fichiers créés / modifiés

```
core/core-database/
├── entity/
│   ├── HighlightEntity.kt        ← +HighlightColor enum
│   ├── NoteEntity.kt             ← FK → HighlightEntity CASCADE
│   └── BookmarkEntity.kt
├── dao/
│   ├── HighlightDao.kt
│   ├── NoteDao.kt
│   └── BookmarkDao.kt
├── relation/HighlightWithNote.kt
└── TaladzDatabase.kt             ← version 4 + 3 nouveaux DAOs

data/data-reader/
└── repository/AnnotationsRepository.kt  ← CRUD + export texte

feature/feature-reader/src/.../
├── AnnotationsViewModel.kt
├── AnnotationsPanel.kt           ← BottomSheet avec onglets
└── SelectionMenu.kt              ← AlertDialog couleurs + note
```

---

## Points de contrôle — Checklist livrable

Avant de passer au TP 14, vérifie que :

- [ ] Sélectionner du texte dans l'EPUB → menu contextuel avec 5 couleurs
- [ ] Choisir une couleur → surlignage visible dans le texte (persistant)
- [ ] Ajouter une note à un surlignage → icône visible dans le lecteur
- [ ] Panneau "Mes annotations" affiche tous les surlignages avec notes
- [ ] Cliquer sur un surlignage dans le panneau → navigation vers cette position
- [ ] Bouton Signet → ajoute un signet navigable
- [ ] "Exporter" → feuille de partage Android avec le texte des annotations
- [ ] Fermer et rouvrir le lecteur → les surlignages sont toujours là
- [ ] `./gradlew :core:core-database:connectedAndroidTest` → 5 tests passent
- [ ] CI GitHub Actions verte

---

*TP 13 terminé. Prochain : TP 14 — Sécurité finale, R8, ProGuard et audit.*
