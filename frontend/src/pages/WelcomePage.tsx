import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Plus,
  BookOpen,
  ClipboardList,
  Pencil,
  Code2,
  TestTube2,
  Rocket,
  Wrench,
  GitBranch,
  Sparkles,
  FileArchive,
} from 'lucide-react'
import Layout from '@/components/common/Layout'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
}

const stages = [
  { name: 'Requirements', icon: ClipboardList, color: 'text-blue-500' },
  { name: 'Design', icon: Pencil, color: 'text-purple-500' },
  { name: 'Development', icon: Code2, color: 'text-green-500' },
  { name: 'Testing', icon: TestTube2, color: 'text-amber-500' },
  { name: 'Deployment', icon: Rocket, color: 'text-rose-500' },
  { name: 'Maintenance', icon: Wrench, color: 'text-slate-500' },
]

const features = [
  {
    icon: GitBranch,
    title: 'Code Analysis',
    description: 'Connect GitHub repositories for automatic code analysis',
    color: 'text-blue-500',
    bg: 'bg-blue-50',
  },
  {
    icon: Sparkles,
    title: 'AI Generation',
    description: 'Generate documentation tailored to each SDLC phase',
    color: 'text-purple-500',
    bg: 'bg-purple-50',
  },
  {
    icon: FileArchive,
    title: 'Export Bundle',
    description: 'Export all documentation as organized files',
    color: 'text-green-500',
    bg: 'bg-green-50',
  },
]

export default function WelcomePage() {
  return (
    <Layout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto py-12"
      >
        {/* Hero Section */}
        <motion.div variants={itemVariants} className="text-center mb-12">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-500 shadow-lg shadow-primary-500/30">
              <BookOpen className="h-10 w-10 text-white" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Welcome to DocuLens
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-slate-600 max-w-xl mx-auto mb-8">
            Generate comprehensive documentation for every phase of your
            software development lifecycle.
          </p>

          {/* CTA Button */}
          <Link
            to="/projects/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 transition-colors shadow-lg shadow-primary-500/30"
          >
            <Plus className="h-5 w-5" />
            Create Your First Project
          </Link>
        </motion.div>

        {/* SDLC Coverage Section */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl border border-slate-200 p-8 mb-8"
        >
          <h2 className="text-center text-sm font-semibold text-slate-900 mb-6">
            Complete SDLC Documentation Coverage
          </h2>

          <div className="flex justify-center items-center gap-4 flex-wrap">
            {stages.map((stage, index) => (
              <div key={stage.name} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 mb-2">
                    <stage.icon className={`h-6 w-6 ${stage.color}`} />
                  </div>
                  <span className="text-xs text-slate-600">{stage.name}</span>
                </div>
                {index < stages.length - 1 && (
                  <div className="mx-3 text-slate-300 hidden sm:block">→</div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={itemVariants}
          className="grid md:grid-cols-3 gap-4"
        >
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-xl border border-slate-200 p-5"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${feature.bg} mb-3`}>
                <feature.icon className={`h-5 w-5 ${feature.color}`} />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-500">{feature.description}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </Layout>
  )
}
