# Spatial Intelligence Enhancement Plan
## Advanced Code Indexing with @xenova/transformers

### 🎯 Overview
Transform CodeContext Pro from conversation-focused to full codebase spatial intelligence.

### 📊 Current vs Enhanced Capabilities

| Feature | Current | With @xenova/transformers |
|---------|---------|--------------------------|
| File tracking | Basic metadata | Full content indexing |
| Code understanding | None | Function/class/variable level |
| Dependencies | Manual mentions | Automatic discovery |
| Cross-file relationships | None | Semantic relationship mapping |
| Code search | Conversation-only | Code + conversation unified |
| Refactoring assistance | None | Impact analysis |

### 🏗️ Architecture Enhancement

#### 1. Code Content Indexer
```typescript
export class CodeContentIndexer {
  private codeParser: CodeParser;
  private embeddingService: EmbeddingService;
  
  async indexFile(filePath: string): Promise<CodeIndex> {
    const content = await fs.readFile(filePath, 'utf8');
    const ast = await this.codeParser.parse(content, filePath);
    
    return {
      file: filePath,
      functions: ast.functions.map(f => ({
        name: f.name,
        signature: f.signature,
        embedding: await this.embeddingService.generateEmbedding(f.body),
        dependencies: f.calls,
        complexity: f.cyclomaticComplexity
      })),
      classes: ast.classes.map(c => ({
        name: c.name,
        methods: c.methods,
        embedding: await this.embeddingService.generateEmbedding(c.body),
        inheritance: c.extends,
        implements: c.implements
      })),
      imports: ast.imports,
      exports: ast.exports,
      concepts: await this.extractConcepts(content),
      semanticEmbedding: await this.embeddingService.generateCodeEmbedding(content, {
        language: this.detectLanguage(filePath),
        includeComments: true,
        focusOnFunctions: true
      })
    };
  }
}
```

#### 2. Dependency Graph Builder
```typescript
export class DependencyGraphBuilder {
  async buildProjectGraph(projectPath: string): Promise<ProjectGraph> {
    const files = await this.scanCodeFiles(projectPath);
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    
    for (const file of files) {
      const index = await this.codeIndexer.indexFile(file);
      
      // Create file node
      nodes.push({
        id: file,
        type: 'file',
        label: path.basename(file),
        embedding: index.semanticEmbedding,
        metadata: {
          functions: index.functions.length,
          classes: index.classes.length,
          complexity: index.functions.reduce((sum, f) => sum + f.complexity, 0)
        }
      });
      
      // Create function/class nodes
      index.functions.forEach(func => {
        nodes.push({
          id: `${file}:${func.name}`,
          type: 'function',
          label: func.name,
          embedding: func.embedding,
          parent: file
        });
        
        // Create dependency edges
        func.dependencies.forEach(dep => {
          edges.push({
            source: `${file}:${func.name}`,
            target: dep,
            relationship: 'calls',
            strength: 1.0
          });
        });
      });
    }
    
    return { nodes, edges };
  }
}
```

#### 3. Semantic Code Search
```typescript
export class SemanticCodeSearchEngine {
  async searchCode(query: string, options: CodeSearchOptions = {}): Promise<CodeSearchResult[]> {
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);
    const results: CodeSearchResult[] = [];
    
    // Search file content
    const fileMatches = await this.searchFiles(queryEmbedding, options);
    
    // Search function signatures and bodies
    const functionMatches = await this.searchFunctions(queryEmbedding, options);
    
    // Search conversations about code
    const conversationMatches = await this.searchConversations(query, options);
    
    // Combine and rank results
    return this.combineAndRankResults([
      ...fileMatches,
      ...functionMatches, 
      ...conversationMatches
    ]);
  }
  
  async findSimilarCode(filePath: string, functionName?: string): Promise<SimilarCodeResult[]> {
    const targetEmbedding = functionName 
      ? await this.getFunctionEmbedding(filePath, functionName)
      : await this.getFileEmbedding(filePath);
      
    return this.findSimilarEmbeddings(targetEmbedding, {
      excludeFile: filePath,
      minSimilarity: 0.7
    });
  }
  
  async analyzeRefactoringImpact(filePath: string, changes: CodeChange[]): Promise<RefactoringImpact> {
    const dependents = await this.findDependentCode(filePath);
    const impactAnalysis: RefactoringImpact = {
      affectedFiles: [],
      riskyChanges: [],
      suggestions: []
    };
    
    for (const change of changes) {
      if (change.type === 'rename_function') {
        const callers = await this.findFunctionCallers(filePath, change.oldName);
        impactAnalysis.affectedFiles.push(...callers);
      }
    }
    
    return impactAnalysis;
  }
}
```

### 🔧 Enhanced CLI Commands

#### New Code Intelligence Commands
```bash
# Index entire codebase
ctx index --full --language typescript

# Search code semantically  
ctx search "authentication logic" --include-code --files

# Find similar code
ctx similar --file src/auth.ts --function validateToken

# Analyze code relationships
ctx graph --file src/auth.ts --depth 2

# Refactoring impact analysis
ctx impact --file src/user.ts --function "rename:getUser->fetchUser"

# Code insights
ctx insights --code --complexity --dependencies

# Find unused/orphaned code
ctx analyze --unused --orphaned

# Dependency analysis
ctx deps --file src/auth.ts --reverse --graph
```

### 📈 Database Schema Extensions

#### New Tables for Code Intelligence
```sql
-- Code file content index
CREATE TABLE code_files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  language TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  embedding TEXT NOT NULL,
  last_indexed DATETIME DEFAULT CURRENT_TIMESTAMP,
  functions_count INTEGER DEFAULT 0,
  classes_count INTEGER DEFAULT 0,
  complexity_score INTEGER DEFAULT 0,
  FOREIGN KEY (project_id) REFERENCES projects (id)
);

-- Function/method index
CREATE TABLE code_functions (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  name TEXT NOT NULL,
  signature TEXT,
  start_line INTEGER,
  end_line INTEGER,
  embedding TEXT NOT NULL,
  complexity INTEGER DEFAULT 1,
  calls TEXT, -- JSON array of function calls
  called_by TEXT, -- JSON array of callers
  FOREIGN KEY (file_id) REFERENCES code_files (id)
);

-- Class/interface index  
CREATE TABLE code_classes (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'class', 'interface', 'enum'
  start_line INTEGER,
  end_line INTEGER,
  embedding TEXT NOT NULL,
  extends TEXT, -- Parent class
  implements TEXT, -- JSON array of interfaces
  methods TEXT, -- JSON array of method names
  FOREIGN KEY (file_id) REFERENCES code_files (id)
);

-- Dependency relationships
CREATE TABLE code_dependencies (
  id TEXT PRIMARY KEY,
  source_file_id TEXT NOT NULL,
  target_file_id TEXT NOT NULL,
  dependency_type TEXT NOT NULL, -- 'import', 'call', 'extend', 'implement'
  strength REAL DEFAULT 1.0,
  line_number INTEGER,
  FOREIGN KEY (source_file_id) REFERENCES code_files (id),
  FOREIGN KEY (target_file_id) REFERENCES code_files (id)
);

-- Code concepts extracted from content
CREATE TABLE code_concepts (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  concept TEXT NOT NULL,
  confidence REAL NOT NULL,
  embedding TEXT NOT NULL,
  occurrences INTEGER DEFAULT 1,
  FOREIGN KEY (file_id) REFERENCES code_files (id)
);
```

### 🎯 User Experience Scenarios

#### 1. Intelligent Code Discovery
```bash
# Developer asks: "Where do we handle password hashing?"
ctx search "password hashing" --include-code

# Results show:
# - Conversations about password security
# - Functions in auth.ts that hash passwords  
# - Configuration files with bcrypt settings
# - Tests that verify password hashing
```

#### 2. Refactoring Assistance
```bash
# Before renaming a function
ctx impact --file src/auth.ts --function validateUser

# Shows:
# - 15 files that call this function
# - 3 test files that reference it
# - 1 API endpoint that depends on it
# - Suggested refactoring steps
```

#### 3. Architecture Understanding
```bash
# New team member explores codebase
ctx graph --concept "user authentication" --visual

# Generates:
# - Dependency graph showing auth flow
# - Related files and functions
# - Conversation history about auth decisions
# - Similar patterns in other parts of codebase
```

### 🚀 Implementation Priority

#### Phase 1: Core Code Indexing
- [ ] File content parsing and embedding
- [ ] Function/class extraction
- [ ] Basic dependency tracking
- [ ] Enhanced search integration

#### Phase 2: Relationship Mapping  
- [ ] Cross-file dependency analysis
- [ ] Call graph generation
- [ ] Semantic relationship discovery
- [ ] Impact analysis tools

#### Phase 3: Advanced Intelligence
- [ ] Code similarity detection
- [ ] Refactoring suggestions
- [ ] Architecture visualization
- [ ] Pattern recommendation

#### Phase 4: AI-Powered Insights
- [ ] Code quality analysis
- [ ] Technical debt identification  
- [ ] Performance bottleneck detection
- [ ] Security vulnerability patterns

### 🎉 Expected Impact

With @xenova/transformers and this spatial intelligence system, CodeContext Pro becomes:

1. **The smartest codebase assistant** - Understands code at function level
2. **Refactoring-aware** - Predicts impact of changes
3. **Architecture-intelligent** - Maps relationships and dependencies  
4. **Context-complete** - Unifies code + conversations + decisions
5. **Team-collaborative** - Shares code insights across team members

This would make CodeContext Pro the **most advanced AI development platform**, combining persistent memory with deep code understanding.