---
title: MDP Homomorphic Networks：强化学习中的群对称性（Group Symmetries）
createTime: 2025/08/17 15:42:22
permalink: /article/tml6nabz/
---


更详细的内容可以看[MDP Homomorphic Networks](https://zhuanlan.zhihu.com/p/655937679) 这篇讲解, 这里更多的讲讲代码的实现.
经过了两天, 发现自已的代码能力还是不够
<!-- more -->
## 基础概念

### 不变性(Invariance)

不变 (Invariance) 与对称 (Symmetries)：等价类中的点通常存在一定的关系，这可以用一个变换操作 $L_g : \mathcal{X} \to \mathcal{X}$，其中 $g \in G$，$G$ 表示群。如果 $L_g$ 满足

$$f(x) = f(L_g[x]), \quad \text{for all } g \in G, x \in \mathcal{X}$$

简单来说就是, 经过变化后, 输出将保持不变, 在具体的实现里, 也就是说 **价值函数** 应该是一个不变的

### 等变性(Equivariance)

等变 (Equivariance)：与不变相关的另一个概念是等变。给定一个变换操作 $L_g : \mathcal{X} \to \mathcal{X}$，和一个映射 $f : \mathcal{X} \to \mathcal{Y}$，如果存在 $f$ 输出空间上的另一个变换操作 $K_g : \mathcal{Y} \to \mathcal{Y}$，使得

$K_g[f(x)] = f(L_g[x]), \quad \text{for all } g \in G, x \in \mathcal{X}$

### 代码

对于等变网络的实现, 主要是实现其中的等变网络层, 其主要的实现在论文中的描述为:

本文考虑在线性层的基础上进行改进，使其满足等变性。考虑一个线性层 $z' = \mathbf{W}z + \mathbf{b}$，
其中 $\mathbf{W} \in \mathbb{R}^{D_{out} \times D_{in}}$ 表示权重矩阵，$\mathbf{b} \in \mathbb{R}^{D_{in}}$ 表示偏置向量。为了简化分析，将偏置
融合进权重矩阵：$\mathbf{W} \mapsto [\mathbf{W}, \mathbf{b}]$，$z \mapsto [z, 1]^T$，将该增强版权重的空间记为 $\mathcal{W}_{total}$。对
于矩阵形式的线性群变换操作，$(L_g, K_g)$，这里 $L_g$ 表示输入变换，$K_g$ 表示输出变换，我
们需要解一下线性方程组：

$$\mathbf{K}_g \mathbf{W}z = \mathbf{W}\mathbf{L}_g z, \quad \text{for all } g \in G, z \in \mathbb{R}^{D_{in} + 1}$$

方程对所有 $z$ 成立，因此可以去掉 $z$。我们的目标是求解所有满足该方程的权重，将这些等
变权重的空间记为 $\mathcal{W}$，$\mathcal{W}$ 实际上可以写为

$$\mathcal{W} \triangleq \{\mathbf{W} \in \mathcal{W}_{total} | \mathbf{K}_g \mathbf{W} = \mathbf{W}\mathbf{L}_g, \text{for all } g \in G\}$$

对于任意 $g \in G$，$\mathbf{K}_g \mathbf{W} = \mathbf{W}\mathbf{L}_g$ 对于 $\mathbf{W}$ 都是线性的。因此，为了找到 $\mathcal{W}$，需要求解一
系列 $\mathbf{W}$ 的线性方程。

为了求解该线性方程组，首先构造一个运算器 symmetrizer $S(\mathbf{W})$：

$$S(\mathbf{W}) \triangleq \frac{1}{|G|} \sum_{g \in G} \mathbf{K}_g^{-1} \mathbf{W}\mathbf{L}_g$$

最后的这个公式就是实现等变网络的核心部分。它通过对所有群元素的变换进行平均，来构造一个满足等变性的线性层。

其核心实现为

```python
def symmetrize(W, group):
    """
    Create equivariant weight matrix
    """
    Wsym = 0
    for parameter in group.parameters:
        input_trans = group._input_transformation(W, parameter)
        Wsym += group._output_transformation(input_trans, parameter)
    return Wsym
```

group 就是下面的 `GroupRepresentations` 类, 其主要是一个 `list[torch.FloatTensor]` 的封装, 其中每个元素都是一个矩阵, 代表了一个变换操作
> [!NOTE]
> 说实话我没看懂这个变化为什么是这样写的, 不知道其中的两个变化代表什么, 矩阵学的太差了只能说, 不过这也有个挺好意思的点
> 这里要求的 K 逆, 实际上和 K 是一样的, 少了一个求逆的运算

```python
class GroupRepresentations:
    """
    Class to hold representations
    """
    def __init__(self, trans_set, name):
        """
        """
        self.representations = trans_set
        self.name = name

    def __len__(self):
        """
        """
        return len(self.representations)

    def __getitem__(self, idx):
        """
        """
        return self.representations[idx]

```

```python
import numpy as np
import torch

from .ops import GroupRepresentations


def get_cartpole_state_group_representations():
    """
    Representation of the group symmetry on the state: a multiplication of all
    state variables by -1
    """
    representations = [torch.FloatTensor(np.eye(4)),
                       torch.FloatTensor(-1*np.eye(4))]
    return GroupRepresentations(representations, "CartPoleStateGroupRepr")

```

cartpole 的状态空间为
`Box(\[-4.8 -inf -0.41887903 -inf], [4.8 inf 0.41887903 inf], (4,), float32`
其中包含了四个变量, 分别是

1. 小车位置(-4.8 到 4.8)
2. 小车速度(-inf 到 inf)
3. 杆子角度(-0.41887903 到 0.41887903)
4. 杆子角速度(-inf 到 inf)
做的变换为 x = -x

```python
def get_cartpole_action_group_representations():
    """
    Representation of the group symmetry on the policy: a permutation of the
    actions
    """
    representations = [torch.FloatTensor(np.eye(2)),
                       torch.FloatTensor(np.array([[0, 1], [1, 0]]))]
    return GroupRepresentations(representations, "CartPoleActionGroupRepr")
```

cartpole 的动作空间为
`Discrete(2)`, 其中包含了两个动作, 分别是
0.向左移动小车
1.向右移动小车
做的变换为交换两个动作, 即 0 和 1 互换

```python

def get_cartpole_invariants():
    """
    Function to enable easy construction of invariant layers (for value
    networks)
    """
    representations = [torch.FloatTensor(np.eye(1)),
                       torch.FloatTensor(np.eye(1))]
    return GroupRepresentations(representations, "CartPoleInvariantGroupRepr")
```

> [!IMPORTANT]
> 对于 `GroupRepresentations`, 就是对 `representations` 的一个小封装, 基本上可以认为就是一个 `list[torch.FloatTensor]`

在这个项目里，fc_sizes（命令行里是 --fcs）就是“全连接隐含层的层宽列表”，用来指定策略/价值网络主干 MLP 的每一层的大小。

```python
class CartpoleBasisModel(torch.nn.Module):

    def __init__(
            self,
            image_shape,
            output_size,
            fc_sizes=[45, 45],
            basis="equivariant",
            gain_type="default",
            ):
        super(CartpoleBasisModel, self).__init__()
        input_size = image_shape[0]
        input_size = 1



        # Main body
        # 4, [64, 128]
        # self.head = MlpModel(input_size, fc_sizes)
        # 4 , [64,64]
        self.head = BasisCartpoleNetworkWrapper(input_size, fc_sizes, gain_type=gain_type, basis=basis) 
        # Policy output
        # self.pi = torch.nn.Linear(fc_sizes[-1], output_size)
        self.pi = BasisCartpoleLayer(fc_sizes[-1], 1, gain_type=gain_type, basis=basis)
        # Value output
        # self.value = torch.nn.Linear(fc_sizes[-1], 1)
        self.value = BasisCartpoleLayer(fc_sizes[-1], 1, gain_type=gain_type, basis=basis, out="invariant")

    def forward(self, in_state, prev_action, prev_reward):
        """Feedforward layers process as [T*B,H]. Return same leading dims as
        input, can be [T,B], [B], or []."""
        state = in_state.type(torch.float)  # Expect torch.uint8 inputs
        # Infer (presence of) leading dimensions: [T,B], [B], or [].
        lead_dim, T, B, state_shape = infer_leading_dims(state, 1)

        base = self.head(state.view(T * B, -1))
        pi = F.softmax(self.pi(base), dim=-1).squeeze() #NOTE: 和MLP的不同,这里有个 squeeze操作
        v = self.value(base).squeeze()

        # Restore leading dimensions: [T,B], [B], or [], as input.
        pi, v = restore_leading_dims((pi, v), lead_dim, T, B)
        return pi, v
```

从普通的 MLP 网络到 等变网络, 可以看到在 forward 中, pi 的输出有一个 `squeeze` 操作

先看看内部的 MLP 实现

```python
class MlpModel(torch.nn.Module):
    """Multilayer Perceptron with last layer linear."""

    def __init__(
            self,
            input_size,
            hidden_sizes,  # Can be empty list for none.
            output_size=None,  # if None, last layer has nonlinearity applied.
            nonlinearity=torch.nn.ReLU,  # Module, not Functional.
            ):
        super().__init__()
        if isinstance(hidden_sizes, int):
            hidden_sizes = [hidden_sizes]
        hidden_layers = [torch.nn.Linear(n_in, n_out) for n_in, n_out in
            zip([input_size] + hidden_sizes[:-1], hidden_sizes)]
        sequence = list()
        for layer in hidden_layers:
            sequence.extend([layer, nonlinearity()])
        if output_size is not None:
            last_size = hidden_sizes[-1] if hidden_sizes else input_size
            sequence.append(torch.nn.Linear(last_size, output_size))
        self.model = torch.nn.Sequential(*sequence)
        self._output_size = (hidden_sizes[-1] if output_size is None
            else output_size)

    def forward(self, input):
        out =  self.model(input)
        return out
```

fc_sizes mlp 默认是 `[64, 128]`, 状态空间的话是 `4`

```python
MlpModel(
  (model): Sequential(
    (0): Linear(in_features=4, out_features=64, bias=True)
    (1): ReLU()
    (2): Linear(in_features=64, out_features=128, bias=True)
    (3): ReLU()
  )
)
```

接下来看看等变网络的实现

```python
class BasisCartpoleNetworkWrapper(torch.nn.Module):
    """
    Wrapper for cartpole basis network
    """
    def __init__(self, input_size, hidden_sizes, basis="equivariant",
                 gain_type="xavier"):
        super().__init__()
        in_group:GroupRepresentations = get_cartpole_state_group_representations()
        out_group:GroupRepresentations = get_cartpole_action_group_representations()

        repr_in = MatrixRepresentation(in_group, out_group)
        repr_out = MatrixRepresentation(out_group, out_group)
        # hidden_sizes = [64, 64]
        self.network = BasisCartpoleNetwork(repr_in, repr_out, input_size, hidden_sizes, basis=basis)

    def forward(self, state):
        return self.network(state)
```

in_group 和 out_group 是动作和状态的组,`list[torch.FloatTensor]` 的形式
看看 `MatrixRepresentation` 做了什么

```python
class MatrixRepresentation(Group):
    """
    Representing group elements as matrices
    """
    def __init__(self, input_matrices:GroupRepresentations, output_matrices:GroupRepresentations):
        self.repr_size_in = input_matrices[0].shape[1]
        self.repr_size_out = output_matrices[0].shape[1]
        # np.eye(4) x 2
        self._input_matrices:GroupRepresentations = input_matrices
        # np.eye(2) x 2 [[0,1], [1,0]]
        self._output_matrices:GroupRepresentations = output_matrices

        self.parameters = range(len(input_matrices))

    def _input_transformation(self, weights, params):
        """
        Input transformation comes from the input group
        W F_g z
        """
        weights = np.matmul(weights, self._input_matrices[params])
        return weights

    def _output_transformation(self, weights, params):
        """
        Output transformation from the output group
        P_g W z
        """
        weights = np.matmul(self._output_matrices[params], weights)
        return weights
```

可以看到这里主要是实现一个矩阵的相乘, 不过这两个参数是什么呢? 我们要看看怎么 `BasisCartpoleNetwork` 中的 `BasisLinear` 的实现`

```python
class BasisCartpoleNetwork(torch.nn.Module):
    """
    """
    def __init__(self, repr_in, repr_out, input_size=1, hidden_sizes,
                 basis="equivariant", gain_type="xavier"):
        """
        Construct basis network for cartpole
        """
        super().__init__()

        if isinstance(hidden_sizes, int):
            hidden_sizes = [hidden_sizes]

        # 不要最后一个,不要第一个, 然后拼起来
        # 举例这有什么用, hidden_sizes = [64, 32, 16]
        # 这样 in_out_list = [(64, 32), (32, 16)]
        # 这样就可以方便的构建 BasisLinear 的输入输出层(感觉没什么用)


        in_out_list = zip(hidden_sizes[:-1], hidden_sizes[1:])
        input_layer = BasisLinear(input_size, hidden_sizes[0], group=repr_in,
                                  basis=basis, gain_type=gain_type,
                                  bias_init=False)

        hidden_layers = [BasisLinear(n_in, n_out, group=repr_out,
                                     gain_type=gain_type, basis=basis,
                                     bias_init=False)
                         for n_in, n_out in in_out_list]

        sequence = list()
        sequence.extend([input_layer, torch.nn.ReLU()])
        for layer in hidden_layers:
            sequence.extend([layer, torch.nn.ReLU()])

        self.model = torch.nn.Sequential(*sequence)


    def forward(self, state):
        """
        """
        out = self.model(state.unsqueeze(1))
        return out
```

Basis Linear通常指的是线性基函数或基线性变换,

$L_g$ 和 $K_g$ 分别表示输入和输出的变换操作。
路径1：先变换输入 (L_g)，再通过网络 (W)
路径2：先通过网络 (W)，再变换输出 (K_g)
n_samples 是样本数, 这里是4096 多取点是为了更好地捕捉群对称性。

```python
class BasisLinear(BasisLayer):
    """
    Group-equivariant linear layer
    """
    def __init__(self, channels_in:int, channels_out:int, group:GroupRepresentation,
                 bias:bool=True, n_samples:int=4096, basis:str="equivariant",
                 gain_type:str="xavier", bias_init:bool=False):
        super().__init__()

        self.group = group
        self.space = basis
        self.repr_size_in = group.repr_size_in
        self.repr_size_out = group.repr_size_out
        self.channels_in = channels_in
        self.channels_out = channels_out

        ### Getting Basis ###
        size = (n_samples, self.repr_size_out, self.repr_size_in)
        new_size = [1, self.repr_size_out, 1, self.repr_size_in]
        basis, self.rank = get_basis(size, group, new_size, space=self.space)
        self.register_buffer("basis", basis)

        gain = compute_gain(gain_type, self.rank, self.channels_in,
                            self.channels_out, self.repr_size_in,
                            self.repr_size_out)

        ### Getting Coefficients ###
        size = [self.rank, self.channels_out, 1, self.channels_in, 1]
        self.coeffs = get_coeffs(size, gain)

        ### Getting bias basis and coefficients ###
        self.has_bias = False
        if bias:
            self.has_bias = True
            if not bias_init:
                gain = 1
            size = [n_samples, self.repr_size_out, 1]
            new_size = [1, self.repr_size_out]
            basis_bias, self.rank_bias = get_invariant_basis(size, group,
                                                             new_size,
                                                             space=self.space)

            self.register_buffer("basis_bias", basis_bias)

            size = [self.rank_bias, self.channels_out, 1]
            self.coeffs_bias = get_coeffs(size, gain=gain)


    def __repr__(self):
        string = f"{self.space} Linear({self.repr_size_in}, "
        string += f"{self.channels_in}, {self.repr_size_out}, "
        string += f"{self.channels_out}), bias={self.has_bias})"
        return string
```

要对 BasisLinear

```python
class BasisCartpoleLayer(torch.nn.Module):
    """
    """
    def __init__(self, input_size, output_size, basis="equivariant",
                 out="equivariant", gain_type="xavier"):
        """
        Wrapper for single layer with cartpole symmetries, allows
        invariance/equivariance switch. Equivariance is for regular layers,
        invariance is needed for the value network output
        """
        super().__init__()
        if out == "equivariant":
            out_group = get_cartpole_action_group_representations()
            repr_out = MatrixRepresentation(out_group, out_group)
        elif out == "invariant":
            in_group = get_cartpole_action_group_representations()
            out_group = get_cartpole_invariants()
            repr_out = MatrixRepresentation(in_group, out_group)

        self.fc1 = BasisLinear(input_size, output_size, group=repr_out,
                               basis=basis, gain_type=gain_type,
                               bias_init=False)

    def forward(self, state):
        """
        """
        return self.fc1(state.unsqueeze(1))
```

```python
BasisCartpoleNetworkWrapper(
  (network): BasisCartpoleNetwork(
    (model): Sequential(
      (0): equivariant Linear(4, 1, 2, 64), bias=True)
      (1): ReLU()
      (2): equivariant Linear(2, 64, 2, 64), bias=True)
      (3): ReLU()
    )
  )
)
BasisCartpoleLayer(
  (fc1): equivariant Linear(2, 64, 2, 1), bias=True)
)
BasisCartpoleLayer(
  (fc1): equivariant Linear(2, 64, 1, 1), bias=True)
)
```
